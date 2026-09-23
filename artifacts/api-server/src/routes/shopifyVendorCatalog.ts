import { Router, type IRouter, type Request } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { db, shopifyVendorProductsTable, shopifyVendorProductHistoryTable, vendorsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { hasAdministratorAccess } from "../lib/adminAccess";
import { ShopifyAdminError, shopifyAdminRequest as admin } from "../lib/shopifyAdminClient";

const router: IRouter = Router();
type Variant = {
  id: string;
  price: string;
  compareAtPrice: string | null;
  inventoryQuantity: number;
  inventoryItem: { id: string; tracked: boolean;
    inventoryLevel: { quantities: Array<{ name: string; quantity: number }> } | null };
  selectedOptions: Array<{ name: string; value: string }>;
};
type ShopProduct = {
  id: string; title: string; descriptionHtml: string; productType: string;
  status: string; updatedAt: string;
  options: Array<{ id: string; name: string; optionValues: Array<{ name: string }> }>;
  media: { nodes: Array<{ id: string; originalSource?: string;
    image?: { url: string } | null }> };
  collections: { nodes: Array<{ id: string; ruleSet: unknown | null }> };
  variants: { nodes: Variant[] };
};
const PRODUCT_FIELDS = `id title descriptionHtml productType status updatedAt
  options { id name optionValues { name } }
  media(first: 20) { nodes { id ... on MediaImage { image { url } } } }
  collections(first: 50) { nodes { id ruleSet { appliedDisjunctively } } }
  variants(first: 100) { nodes {
    id price compareAtPrice inventoryQuantity selectedOptions { name value }
    inventoryItem { id tracked inventoryLevel(locationId: $locationId) {
      quantities(names: ["available"]) { name quantity }
    } }
  } }`;
const PRODUCT_QUERY = `query($id: ID!, $locationId: ID!) {
  product(id: $id) { ${PRODUCT_FIELDS} }
}`;

type VariantInput = { size: string; color: string; inventory: number; expectedInventory: number | null };
type CatalogInput = {
  title: string; description: string; category: string;
  imageUrl: string | null;
  price: string; compareAtPrice: string | null;
  variants: VariantInput[]; collectionId: string | null;
  status: "draft" | "published" | "archived";
};
function parseInput(value: unknown): CatalogInput | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const title = typeof v.title === "string" ? v.title.trim() : "";
  const description = typeof v.description === "string" ? v.description.trim() : "";
  const category = typeof v.category === "string" ? v.category.trim() : "";
  const price = Number(v.price);
  const compare = v.compareAtPrice == null || v.compareAtPrice === "" ? null : Number(v.compareAtPrice);
  const collectionId = v.collectionId == null || v.collectionId === "" ? null : v.collectionId;
  const imageUrl = v.imageUrl == null || v.imageUrl === "" ? null : v.imageUrl;
  if (!title || title.length > 255 || !description || !category || category.length > 255 ||
      !Number.isFinite(price) || price < 0 || Math.abs(price * 100 - Math.round(price * 100)) > 1e-6 ||
      (compare !== null && (!Number.isFinite(compare) || compare < 0 ||
        Math.abs(compare * 100 - Math.round(compare * 100)) > 1e-6)) ||
      !["draft", "published", "archived"].includes(String(v.status)) ||
      (imageUrl !== null && (typeof imageUrl !== "string" || imageUrl.length > 2048 ||
        !/^https:\/\/[^/]+\/.+/i.test(imageUrl))) ||
      (collectionId !== null && (typeof collectionId !== "string" || !/^gid:\/\/shopify\/Collection\/\d+$/.test(collectionId))) ||
      !Array.isArray(v.variants) || v.variants.length < 1 || v.variants.length > 100) return null;
  const variants: VariantInput[] = [];
  const keys = new Set<string>();
  for (const item of v.variants) {
    if (!item || typeof item !== "object") return null;
    const size = typeof item.size === "string" ? item.size.trim() : "";
    const color = typeof item.color === "string" ? item.color.trim() : "";
    const inventory = item.inventory;
    const expectedInventory = item.expectedInventory == null ? null : item.expectedInventory;
    const key = JSON.stringify([size.toLowerCase(), color.toLowerCase()]);
    if (size.length > 100 || color.length > 100 || !Number.isInteger(inventory) ||
        inventory < 0 || (expectedInventory !== null &&
          (!Number.isInteger(expectedInventory) || expectedInventory < 0)) || keys.has(key)) return null;
    keys.add(key);
    variants.push({ size, color, inventory, expectedInventory: expectedInventory as number | null });
  }
  // Each option must be present for every variant; Shopify rejects partial option sets.
  if (variants.some((variant) => Boolean(variant.size) !== Boolean(variants[0].size) ||
      Boolean(variant.color) !== Boolean(variants[0].color))) return null;
  if (variants.length > 1 && !variants[0].size && !variants[0].color) return null;
  return {
    title, description, category, price: price.toFixed(2),
    compareAtPrice: compare === null ? null : compare.toFixed(2),
    collectionId: collectionId as string | null, imageUrl: imageUrl as string | null, variants,
    status: v.status as CatalogInput["status"],
  };
}
const escapeHtml = (value: string) =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");

async function access(req: Request, vendorId: string, readOnly = false) {
  const userId = getAuth(req).userId;
  if (!userId) return { error: 401, message: "Sign in required." } as const;
  const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, vendorId));
  if (!vendor) return { error: 404, message: "Vendor not found." } as const;
  if (vendor.ownerUserId !== userId) {
    const user = await clerkClient.users.getUser(userId);
    const reviewer = readOnly && (
      user.publicMetadata.role === "vendor_reviewer" ||
      user.publicMetadata.role === "vendor-reviewer" ||
      user.publicMetadata.vendorReviewer === true
    );
    if (!hasAdministratorAccess(user) && !reviewer) {
      return { error: 403, message: "Vendor access required." } as const;
    }
  }
  if (vendor.status !== "approved") return { error: 403, message: "Only approved vendors can manage Shopify products." } as const;
  return { vendor, userId };
}
async function loadProduct(id: string, locationId: string): Promise<ShopProduct | null> {
  const result = await admin<{ product: ShopProduct | null }>(PRODUCT_QUERY, { id, locationId });
  return result.product;
}
function availableAtLocation(variant: Variant): number {
  return variant.inventoryItem.inventoryLevel?.quantities
    .find((quantity) => quantity.name === "available")?.quantity ?? 0;
}
async function ownedProduct(req: Request, id: string, readOnly = false) {
  const [mapping] = await db.select().from(shopifyVendorProductsTable)
    .where(eq(shopifyVendorProductsTable.productId, id));
  if (!mapping) return { error: 404, message: "Shopify product not found in your catalog." } as const;
  const permission = await access(req, mapping.vendorId, readOnly);
  return { ...permission, mapping };
}
async function record(productId: string, actorUserId: string, action: string) {
  await db.insert(shopifyVendorProductHistoryTable).values({ productId, actorUserId, action });
}
async function catalogOptions() {
  const result = await admin<{
    locations: { nodes: Array<{ id: string; name: string }> };
    currentAppInstallation: { publication: { id: string } | null } | null;
    collections: { nodes: Array<{ id: string; title: string; ruleSet: unknown | null }> };
  }>(`query { locations(first: 1, includeInactive: false, sortKey: ID) { nodes { id name } }
    currentAppInstallation { publication { id } }
    collections(first: 100) { nodes { id title ruleSet { appliedDisjunctively } } }`);
  return result;
}
function variantKey(size: string, color: string) { return JSON.stringify([size, color]); }
function selected(variant: Variant) {
  return variantKey(
    variant.selectedOptions.find((option) => option.name === "Size")?.value ?? "",
    variant.selectedOptions.find((option) => option.name === "Color")?.value ?? "",
  );
}
function variantValues(variant: VariantInput) {
  return [
    ...(variant.size ? [{ optionName: "Size", name: variant.size }] : []),
    ...(variant.color ? [{ optionName: "Color", name: variant.color }] : []),
  ];
}
async function syncVariants(product: ShopProduct, input: CatalogInput, locationId: string) {
  const removedOptions = product.options.filter((option) =>
    (option.name === "Size" && !input.variants[0].size) ||
    (option.name === "Color" && !input.variants[0].color));
  if (removedOptions.length) {
    await admin(`mutation($productId: ID!, $options: [ID!]!) {
      productOptionsDelete(productId: $productId, options: $options,
        strategy: DEFAULT) { userErrors { field message } }
    }`, { productId: product.id, options: removedOptions.map((option) => option.id) });
    product = (await loadProduct(product.id, locationId))!;
  }
  const desired = new Set(input.variants.map((v) => variantKey(v.size, v.color)));
  const existing = new Map(product.variants.nodes.map((v) => [selected(v), v]));
  const missing = input.variants.filter((v) => !existing.has(variantKey(v.size, v.color)));
  if (missing.length) {
    const additions = [
      ["Size", [...new Set(input.variants.map((v) => v.size).filter(Boolean))]],
      ["Color", [...new Set(input.variants.map((v) => v.color).filter(Boolean))]],
    ] as const;
    for (const [name, values] of additions) {
      if (!values.length) continue;
      const option = product.options.find((o) => o.name === name);
      if (!option) {
        await admin(`mutation($productId: ID!, $options: [OptionCreateInput!]!) {
          productOptionsCreate(productId: $productId, options: $options,
            variantStrategy: LEAVE_AS_IS) { userErrors { field message } }
        }`, { productId: product.id, options: [{ name, values: values.map((value) => ({ name: value })) }] });
      } else {
        const known = new Set(option.optionValues.map((v) => v.name));
        const newValues = values.filter((value) => !known.has(value));
        if (newValues.length) {
          await admin(`mutation($productId: ID!, $option: OptionUpdateInput!,
            $values: [OptionValueCreateInput!]!) {
            productOptionUpdate(productId: $productId, option: $option,
              optionValuesToAdd: $values) { userErrors { field message } }
          }`, { productId: product.id, option: { id: option.id },
            values: newValues.map((value) => ({ name: value })) });
        }
      }
    }
    await admin(`mutation($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkCreate(productId: $productId, variants: $variants,
        strategy: REMOVE_STANDALONE_VARIANT) { userErrors { field message } }
    }`, { productId: product.id, variants: missing.map((v) => ({
      price: input.price, compareAtPrice: input.compareAtPrice,
      optionValues: variantValues(v),
    })) });
    product = (await loadProduct(product.id, locationId))!;
  }
  const updates = input.variants.map((v) => {
    const match = product.variants.nodes.find((item) => selected(item) === variantKey(v.size, v.color));
    if (!match) throw new ShopifyAdminError(`Shopify did not create variant ${v.size} ${v.color}.`);
    return { id: match.id, price: input.price, compareAtPrice: input.compareAtPrice };
  });
  await admin(`mutation($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) { userErrors { field message } }
  }`, { productId: product.id, variants: updates });
  product = (await loadProduct(product.id, locationId))!;
  for (const desiredVariant of input.variants) {
    const variant = product.variants.nodes.find((v) =>
      selected(v) === variantKey(desiredVariant.size, desiredVariant.color));
    if (!variant) throw new ShopifyAdminError("Shopify variant could not be loaded.");
    await admin(`mutation($id: ID!, $input: InventoryItemInput!) {
      inventoryItemUpdate(id: $id, input: $input) { userErrors { field message } }
    }`, { id: variant.inventoryItem.id, input: { tracked: true } });
    await admin(`mutation($inventoryItemId: ID!, $locationId: ID!) {
      inventoryActivate(inventoryItemId: $inventoryItemId, locationId: $locationId) {
        userErrors { field message }
      }
    }`, { inventoryItemId: variant.inventoryItem.id, locationId });
    const levels = await admin<{
      inventoryItem: { inventoryLevel: {
        quantities: Array<{ name: string; quantity: number }>;
      } | null } | null;
    }>(`query($id: ID!, $locationId: ID!) {
      inventoryItem(id: $id) {
        inventoryLevel(locationId: $locationId) {
          quantities(names: ["available"]) { name quantity }
        }
      }
    }`, { id: variant.inventoryItem.id, locationId });
    const available = levels.inventoryItem?.inventoryLevel?.quantities
      .find((quantity) => quantity.name === "available")?.quantity;
    if (available === undefined) throw new ShopifyAdminError("Shopify inventory location could not be loaded.");
    if (desiredVariant.expectedInventory !== null && available !== desiredVariant.expectedInventory) {
      throw new ShopifyAdminError("Stock at the managed Shopify location changed. Refresh before saving.");
    }
    await admin(`mutation($input: InventorySetQuantitiesInput!) {
      inventorySetQuantities(input: $input) { userErrors { field message } }
    }`, { input: { name: "available", reason: "correction",
      quantities: [{ inventoryItemId: variant.inventoryItem.id, locationId,
        quantity: desiredVariant.inventory, changeFromQuantity: available }] } });
  }
  const obsolete = product.variants.nodes.filter((v) => !desired.has(selected(v))).map((v) => v.id);
  if (obsolete.length) {
    await admin(`mutation($productId: ID!, $variantsIds: [ID!]!) {
      productVariantsBulkDelete(productId: $productId, variantsIds: $variantsIds) {
        userErrors { field message }
      }
    }`, { productId: product.id, variantsIds: obsolete });
  }
  const verified = await loadProduct(product.id, locationId);
  for (const desiredVariant of input.variants) {
    const variant = verified?.variants.nodes.find((v) =>
      selected(v) === variantKey(desiredVariant.size, desiredVariant.color));
    if (!variant || !variant.inventoryItem.tracked ||
        availableAtLocation(variant) !== desiredVariant.inventory) {
      throw new ShopifyAdminError("Shopify did not confirm stock at the managed inventory location.");
    }
  }
}
async function syncProduct(product: ShopProduct, input: CatalogInput,
  options: Awaited<ReturnType<typeof catalogOptions>>) {
  const locationId = options.locations.nodes[0]?.id;
  if (!locationId) throw new ShopifyAdminError("Shopify has no active inventory location.");
  if (input.collectionId && !options.collections.nodes.some((c) => c.id === input.collectionId && !c.ruleSet)) {
    throw new ShopifyAdminError("Choose an available Shopify collection.");
  }
  const previous = product.collections.nodes.filter((c) => !c.ruleSet).map((c) => c.id);
  const previousMediaIds = new Set(product.media.nodes.map((m) => m.id));
  const oldImage = product.media.nodes.find((m) => m.image?.url)?.image?.url;
  const addImage = input.imageUrl && oldImage !== input.imageUrl;
  await admin(`mutation($product: ProductUpdateInput!, $media: [CreateMediaInput!]) {
    productUpdate(product: $product, media: $media) { userErrors { field message } }
  }`, { product: { id: product.id, title: input.title,
    descriptionHtml: `<p>${escapeHtml(input.description).replaceAll("\n", "<br>")}</p>`,
    productType: input.category, status: "DRAFT",
    collectionsToLeave: previous.filter((id) => id !== input.collectionId),
    collectionsToJoin: input.collectionId && !previous.includes(input.collectionId)
      ? [input.collectionId] : [] },
    media: addImage ? [{ mediaContentType: "IMAGE", originalSource: input.imageUrl,
      alt: input.title }] : [] });
  product = (await loadProduct(product.id, locationId))!;
  if (addImage && product.media.nodes.length > 1) {
    const added = product.media.nodes.find((media) =>
      !previousMediaIds.has(media.id));
    if (added) {
      await admin(`mutation($id: ID!, $moves: [MoveInput!]!) {
        productReorderMedia(id: $id, moves: $moves) { mediaUserErrors { field message } }
      }`, { id: product.id, moves: [{ id: added.id, newPosition: "0" }] });
    }
  }
  await syncVariants(product, input, locationId);
  if (input.status === "published") {
    const publicationId = options.currentAppInstallation?.publication?.id;
    if (!publicationId) throw new ShopifyAdminError("Shopify Sales Channel publication is not provisioned yet.");
    await admin(`mutation($product: ProductUpdateInput!) {
      productUpdate(product: $product) { userErrors { field message } }
    }`, { product: { id: product.id, status: "ACTIVE" } });
    const publication = await admin<{
      publishablePublish: {
        publishable: { publishedOnPublication: boolean } | null;
      };
    }>(`mutation($id: ID!, $input: [PublicationInput!]!, $publicationId: ID!) {
      publishablePublish(id: $id, input: $input) {
        publishable { publishedOnPublication(publicationId: $publicationId) }
        userErrors { field message }
      }
    }`, { id: product.id, input: [{ publicationId }], publicationId });
    if (!publication.publishablePublish.publishable?.publishedOnPublication) {
      throw new ShopifyAdminError("Shopify did not confirm storefront publication.");
    }
  } else if (input.status === "archived") {
    await admin(`mutation($product: ProductUpdateInput!) {
      productUpdate(product: $product) { userErrors { field message } }
    }`, { product: { id: product.id, status: "ARCHIVED" } });
  }
}
function respondError(req: Request, res: import("express").Response, error: unknown) {
  req.log.error({ err: error }, "Shopify vendor catalog request failed");
  res.status(error instanceof ShopifyAdminError ? 422 : 502)
    .json({ error: error instanceof Error ? error.message : "Shopify catalog unavailable." });
}
router.get("/shopify/vendor-catalog/options", async (req, res): Promise<void> => {
  try {
    const vendorId = String(req.query.vendorId ?? "");
    const permission = await access(req, vendorId);
    if (permission.error) { res.status(permission.error).json({ error: permission.message }); return; }
    const options = await catalogOptions();
    res.json({ collections: options.collections.nodes.filter((c) => !c.ruleSet),
      location: options.locations.nodes[0] ?? null,
      hasPublication: Boolean(options.currentAppInstallation?.publication) });
  } catch (error) { respondError(req, res, error); }
});
router.get("/shopify/vendors/:vendorId/products", async (req, res): Promise<void> => {
  try {
    const permission = await access(req, req.params.vendorId, true);
    if (permission.error) { res.status(permission.error).json({ error: permission.message }); return; }
    const mappings = await db.select().from(shopifyVendorProductsTable)
      .where(eq(shopifyVendorProductsTable.vendorId, req.params.vendorId));
    const options = await catalogOptions();
    const locationId = options.locations.nodes[0]?.id;
    if (!locationId) throw new ShopifyAdminError("Shopify has no active inventory location.");
    const products = await Promise.all(mappings.map(async (mapping) => ({
      productId: mapping.productId, product: await loadProduct(mapping.productId, locationId),
    })));
    res.setHeader("Cache-Control", "no-store");
    res.json(products);
  } catch (error) { respondError(req, res, error); }
});
router.get("/shopify/vendor-products/:id/history", async (req, res): Promise<void> => {
  try {
    const permission = await ownedProduct(req, req.params.id, true);
    if (permission.error) { res.status(permission.error).json({ error: permission.message }); return; }
    const entries = await db.select().from(shopifyVendorProductHistoryTable)
      .where(eq(shopifyVendorProductHistoryTable.productId, req.params.id))
      .orderBy(desc(shopifyVendorProductHistoryTable.changedAt));
    res.json(entries);
  } catch (error) { respondError(req, res, error); }
});
router.post("/shopify/vendors/:vendorId/products", async (req, res): Promise<void> => {
  const permission = await access(req, req.params.vendorId);
  if (permission.error) { res.status(permission.error).json({ error: permission.message }); return; }
  const input = parseInput(req.body);
  if (!input) { res.status(400).json({ error: "Check product details and variant stock." }); return; }
  try {
    const options = await catalogOptions();
    if (input.status === "published" && !options.currentAppInstallation?.publication) {
      throw new ShopifyAdminError("Shopify Sales Channel publication is not provisioned yet.");
    }
    if (!options.locations.nodes.length) throw new ShopifyAdminError("Shopify has no active inventory location.");
    if (input.collectionId && !options.collections.nodes.some((c) => c.id === input.collectionId && !c.ruleSet)) {
      throw new ShopifyAdminError("Choose an available Shopify collection.");
    }
    const result = await admin<{ productCreate: { product: ShopProduct | null } }>(
      `mutation($product: ProductCreateInput!) {
        productCreate(product: $product) { product { id } userErrors { field message } }
      }`, { product: { title: input.title, vendor: permission.vendor.businessName, status: "DRAFT",
        productOptions: [
          ...(input.variants[0].size ? [{ name: "Size", values: [...new Set(input.variants.map((v) => v.size))].map((name) => ({ name })) }] : []),
          ...(input.variants[0].color ? [{ name: "Color", values: [...new Set(input.variants.map((v) => v.color))].map((name) => ({ name })) }] : []),
        ] } });
    const id = result.productCreate.product?.id;
    if (!id) throw new ShopifyAdminError("Shopify did not create the product.");
    // Save ownership immediately: if later Shopify operations fail the draft remains editable.
    await db.insert(shopifyVendorProductsTable).values({ productId: id, vendorId: permission.vendor.id });
    await record(id, permission.userId, "created");
    await syncProduct((await loadProduct(id, options.locations.nodes[0].id))!, input, options);
    res.status(201).json({ productId: id, product: await loadProduct(id, options.locations.nodes[0].id) });
  } catch (error) { respondError(req, res, error); }
});
router.put("/shopify/vendor-products/:id", async (req, res): Promise<void> => {
  const permission = await ownedProduct(req, req.params.id);
  if (permission.error) { res.status(permission.error).json({ error: permission.message }); return; }
  const input = parseInput(req.body);
  if (!input) { res.status(400).json({ error: "Check product details and variant stock." }); return; }
  try {
    const options = await catalogOptions();
    const locationId = options.locations.nodes[0]?.id;
    if (!locationId) throw new ShopifyAdminError("Shopify has no active inventory location.");
    const product = await loadProduct(req.params.id, locationId);
    if (!product) { res.status(404).json({ error: "Shopify product was deleted." }); return; }
    if (req.get("If-Match") !== product.updatedAt) {
      res.status(409).json({ error: "Shopify product changed. Refresh before saving." }); return;
    }
    await syncProduct(product, input, options);
    await record(product.id, permission.userId, input.status === "archived" ? "archived" : "edited");
    res.json({ productId: product.id, product: await loadProduct(product.id, locationId) });
  } catch (error) { respondError(req, res, error); }
});
export default router;