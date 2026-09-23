import { Router, type IRouter } from "express";
import { shopifyStorefrontRequest } from "../lib/shopifyStorefrontClient";

const router: IRouter = Router();

const PRODUCT_FIELDS = `#graphql
  fragment AfrotextileProduct on Product {
    id
    handle
    title
    description
    descriptionHtml
    vendor
    productType
    tags
    availableForSale
    createdAt
    updatedAt
    featuredImage { url altText width height }
    images(first: 8) {
      nodes { url altText width height }
    }
    priceRange {
      minVariantPrice { amount currencyCode }
      maxVariantPrice { amount currencyCode }
    }
    compareAtPriceRange {
      minVariantPrice { amount currencyCode }
      maxVariantPrice { amount currencyCode }
    }
    options { id name values }
    variants(first: 100) {
      nodes {
        id
        title
        availableForSale
        quantityAvailable
        selectedOptions { name value }
        price { amount currencyCode }
        compareAtPrice { amount currencyCode }
        image { url altText width height }
      }
    }
  }
`;

const PRODUCTS_QUERY = `#graphql
  ${PRODUCT_FIELDS}
  query AfrotextileProducts(
    $first: Int!
    $after: String
    $query: String
    $sortKey: ProductSortKeys
    $reverse: Boolean
  ) {
    products(
      first: $first
      after: $after
      query: $query
      sortKey: $sortKey
      reverse: $reverse
    ) {
      nodes { ...AfrotextileProduct }
      pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
    }
  }
`;

const PRODUCT_BY_HANDLE_QUERY = `#graphql
  ${PRODUCT_FIELDS}
  query AfrotextileProductByHandle($handle: String!) {
    product(handle: $handle) { ...AfrotextileProduct }
  }
`;

const COLLECTIONS_QUERY = `#graphql
  query AfrotextileCollections($first: Int!) {
    collections(first: $first, sortKey: TITLE) {
      nodes {
        id
        handle
        title
        description
        image { url altText width height }
      }
    }
  }
`;

const CART_CREATE_MUTATION = `#graphql
  mutation AfrotextileCartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart {
        id
        checkoutUrl
        totalQuantity
        cost {
          subtotalAmount { amount currencyCode }
          totalAmount { amount currencyCode }
          totalTaxAmount { amount currencyCode }
        }
        discountCodes { code applicable }
      }
      userErrors { field message code }
      warnings { message code }
    }
  }
`;

type ShopifyCartLineInput = {
  merchandiseId?: unknown;
  quantity?: unknown;
};

function asPositiveInteger(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function escapeSearchValue(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}

router.get("/shopify/products", async (req, res): Promise<void> => {
  try {
    const first = Math.min(asPositiveInteger(req.query.first, 24), 50);
    const filters: string[] = [];
    const search = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const productType =
      typeof req.query.productType === "string" ? req.query.productType.trim() : "";
    const availability = req.query.available;
    const minimumPrice = Number(req.query.minPrice);
    const maximumPrice = Number(req.query.maxPrice);

    if (search) filters.push(search);
    if (productType) filters.push(`product_type:'${escapeSearchValue(productType)}'`);
    if (availability === "true" || availability === "false") {
      filters.push(`available_for_sale:${availability}`);
    }
    if (Number.isFinite(minimumPrice) && minimumPrice >= 0) {
      filters.push(`price:>=${minimumPrice}`);
    }
    if (Number.isFinite(maximumPrice) && maximumPrice >= 0) {
      filters.push(`price:<=${maximumPrice}`);
    }

    const sort = typeof req.query.sort === "string" ? req.query.sort : "latest";
    const sortConfig =
      sort === "price-asc"
        ? { sortKey: "PRICE", reverse: false }
        : sort === "price-desc"
          ? { sortKey: "PRICE", reverse: true }
          : sort === "title"
            ? { sortKey: "TITLE", reverse: false }
            : { sortKey: "CREATED_AT", reverse: true };

    const data = await shopifyStorefrontRequest<{
      products: {
        nodes: unknown[];
        pageInfo: Record<string, unknown>;
      };
    }>(PRODUCTS_QUERY, {
      first,
      after: typeof req.query.after === "string" ? req.query.after : null,
      query: filters.length > 0 ? filters.join(" AND ") : null,
      ...sortConfig,
    });

    res.setHeader("Cache-Control", "no-store");
    res.json(data.products);
  } catch (error) {
    req.log.error({ err: error }, "Could not load Shopify products");
    res.status(502).json({
      error: error instanceof Error ? error.message : "Could not load Shopify products.",
    });
  }
});

router.get("/shopify/products/:handle", async (req, res): Promise<void> => {
  try {
    const handle = req.params.handle?.trim();
    if (!handle) {
      res.status(400).json({ error: "A product handle is required." });
      return;
    }
    const data = await shopifyStorefrontRequest<{ product: unknown | null }>(
      PRODUCT_BY_HANDLE_QUERY,
      { handle },
    );
    if (!data.product) {
      res.status(404).json({ error: "Shopify product not found." });
      return;
    }
    res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=120");
    res.json(data.product);
  } catch (error) {
    req.log.error({ err: error }, "Could not load Shopify product");
    res.status(502).json({
      error: error instanceof Error ? error.message : "Could not load Shopify product.",
    });
  }
});

router.get("/shopify/collections", async (req, res): Promise<void> => {
  try {
    const data = await shopifyStorefrontRequest<{
      collections: { nodes: unknown[] };
    }>(COLLECTIONS_QUERY, { first: 50 });
    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    res.json(data.collections.nodes);
  } catch (error) {
    req.log.error({ err: error }, "Could not load Shopify collections");
    res.status(502).json({
      error: error instanceof Error ? error.message : "Could not load Shopify collections.",
    });
  }
});

router.post("/shopify/cart", async (req, res): Promise<void> => {
  const lines = Array.isArray(req.body?.lines)
    ? (req.body.lines as ShopifyCartLineInput[])
    : [];
  const normalizedLines = lines.map((line) => ({
    merchandiseId:
      typeof line.merchandiseId === "string" ? line.merchandiseId.trim() : "",
    quantity: asPositiveInteger(line.quantity, 1),
  }));
  if (
    normalizedLines.length === 0 ||
    normalizedLines.length > 100 ||
    normalizedLines.some((line) => !line.merchandiseId)
  ) {
    res.status(400).json({
      error: "Cart lines must include between 1 and 100 valid Shopify variant IDs.",
    });
    return;
  }

  const discountCodes = Array.isArray(req.body?.discountCodes)
    ? req.body.discountCodes
        .filter((value: unknown): value is string => typeof value === "string")
        .map((value: string) => value.trim())
        .filter(Boolean)
        .slice(0, 10)
    : [];

  try {
    const data = await shopifyStorefrontRequest<{
      cartCreate: {
        cart: Record<string, unknown> | null;
        userErrors: Array<{ field?: string[]; message: string; code?: string }>;
        warnings: Array<{ message: string; code?: string }>;
      };
    }>(CART_CREATE_MUTATION, {
      input: {
        lines: normalizedLines,
        ...(discountCodes.length > 0 ? { discountCodes } : {}),
      },
    });

    const firstError = data.cartCreate.userErrors[0];
    if (firstError) {
      res.status(422).json({ error: firstError.message, code: firstError.code });
      return;
    }
    if (!data.cartCreate.cart) {
      res.status(502).json({ error: "Shopify did not create a cart." });
      return;
    }
    res.status(201).json({
      ...data.cartCreate.cart,
      warnings: data.cartCreate.warnings,
    });
  } catch (error) {
    req.log.error({ err: error }, "Could not create Shopify cart");
    res.status(502).json({
      error: error instanceof Error ? error.message : "Could not start Shopify checkout.",
    });
  }
});

export default router;