import express from "express";
import { createServer, type Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({
  stage: "",
  productStatus: "DRAFT",
  quantity: 0,
  otherLocationQuantity: 0,
  published: true,
  ignoreInventoryWrite: false,
  calls: [] as string[],
  history: [] as unknown[],
}));

vi.mock("@clerk/express", () => ({
  getAuth: () => ({ userId: "vendor-owner" }),
  clerkClient: { users: { getUser: vi.fn() } },
}));
vi.mock("@workspace/db", () => ({
  shopifyVendorProductsTable: { productId: "product-id", vendorId: "vendor-id" },
  shopifyVendorProductHistoryTable: { productId: "product-id", changedAt: "changed-at" },
  vendorsTable: { id: "vendor-id" },
  db: {
    select: () => ({
      from: (table: { productId?: string }) => ({
        where: async () => table.productId
          ? [{ productId: "gid://shopify/Product/1", vendorId: "vendor-1" }]
          : [{ id: "vendor-1", ownerUserId: "vendor-owner", status: "approved" }],
      }),
    }),
    insert: () => ({ values: async (value: unknown) => { mock.history.push(value); } }),
  },
}));
vi.mock("drizzle-orm", () => ({ eq: () => undefined, desc: () => undefined }));
vi.mock("../lib/shopifyAdminClient", () => ({
  ShopifyAdminError: class ShopifyAdminError extends Error {},
  shopifyAdminRequest: async (query: string, variables: Record<string, any>) => {
    if (query.includes("locations(first:")) {
      return {
        locations: { nodes: [{ id: "gid://shopify/Location/1", name: "Main" }] },
        collections: { nodes: [] },
        currentAppInstallation: { publication: { id: "gid://shopify/Publication/1" } },
      };
    }
    if (query.includes("inventoryItem(id:")) {
      return { inventoryItem: { inventoryLevel: {
        quantities: [{ name: "available", quantity: mock.quantity }],
      } } };
    }
    if (query.includes("product(id:")) {
      return { product: {
        id: "gid://shopify/Product/1", title: "Wrap", descriptionHtml: "<p>A wrap</p>",
        productType: "Fashion", status: mock.productStatus, updatedAt: "2026-09-23T00:00:00Z",
        collections: { nodes: [] }, media: { nodes: [] }, options: [],
        variants: { nodes: [{
          id: "gid://shopify/ProductVariant/1", price: "20.00",
          compareAtPrice: null, inventoryQuantity: mock.quantity + mock.otherLocationQuantity,
          inventoryItem: { id: "gid://shopify/InventoryItem/1", tracked: true,
            inventoryLevel: { quantities: [{ name: "available", quantity: mock.quantity }] } },
          selectedOptions: [{ name: "Title", value: "Default Title" }],
        }] },
      } };
    }
    const operation = [
      "productUpdate", "productVariantsBulkUpdate", "inventoryItemUpdate",
      "inventoryActivate", "inventorySetQuantities", "publishablePublish",
    ].find((name) => query.includes(`${name}(`));
    if (!operation) throw new Error("Unexpected Shopify query");
    mock.calls.push(operation);
    if (mock.stage === operation) {
      const { ShopifyAdminError } = await import("../lib/shopifyAdminClient");
      throw new ShopifyAdminError(`Shopify rejected ${operation}`);
    }
    if (operation === "productUpdate" && variables.product.status === "ACTIVE") {
      mock.productStatus = "ACTIVE";
    }
    if (operation === "inventorySetQuantities" && !mock.ignoreInventoryWrite) {
      mock.quantity = variables.input.quantities[0].quantity;
    }
    return { [operation]: {
      userErrors: [],
      ...(operation === "publishablePublish"
        ? { publishable: { publishedOnPublication: mock.published } } : {}),
    } };
  },
}));

import router from "./shopifyVendorCatalog";

async function serve() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.log = { error: vi.fn() } as unknown as typeof req.log; next(); });
  app.use(router);
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No test port");
  return { server, url: `http://127.0.0.1:${address.port}` };
}
async function close(server: Server) {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => error ? reject(error) : resolve()));
}
const input = {
  title: "Wrap", description: "A hand-dyed wrap", category: "Fashion",
  price: "20.00", compareAtPrice: null, collectionId: null, imageUrl: null,
  variants: [{ size: "", color: "", inventory: 3 }], status: "published",
};
async function update(url: string, expectedInventory: number | null = null) {
  return fetch(`${url}/shopify/vendor-products/${encodeURIComponent("gid://shopify/Product/1")}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "If-Match": "2026-09-23T00:00:00Z" },
    body: JSON.stringify({ ...input, variants: input.variants.map((variant) =>
      ({ ...variant, expectedInventory })) }),
  });
}

describe("Shopify vendor publication sequence", () => {
  let server: Server;
  let url: string;
  beforeEach(async () => {
    mock.stage = "";
    mock.productStatus = "DRAFT";
    mock.quantity = 0;
    mock.otherLocationQuantity = 0;
    mock.published = true;
    mock.ignoreInventoryWrite = false;
    mock.calls.length = 0;
    mock.history.length = 0;
    ({ server, url } = await serve());
  });
  afterEach(async () => { await close(server); });

  it.each(["productUpdate", "productVariantsBulkUpdate", "inventoryItemUpdate",
    "inventoryActivate", "inventorySetQuantities", "publishablePublish"])(
    "returns failure and writes no success audit when %s fails", async (stage) => {
      mock.stage = stage;
      const response = await update(url);
      expect(response.status).toBe(422);
      expect(((await response.json()) as { error: string }).error).toContain(stage);
      expect(mock.history).toHaveLength(0);
      if (stage !== "publishablePublish") expect(mock.calls).not.toContain("publishablePublish");
    },
  );

  it("returns the Shopify product only after tracked inventory and publication succeed", async () => {
    const response = await update(url);
    expect(response.status).toBe(200);
    const body = await response.json() as {
      product: { status: string; variants: { nodes: Array<{ inventoryQuantity: number }> } };
    };
    expect(body.product.status).toBe("ACTIVE");
    expect(body.product.variants.nodes[0].inventoryQuantity).toBe(3);
    expect(mock.calls).toEqual([
      "productUpdate", "productVariantsBulkUpdate", "inventoryItemUpdate",
      "inventoryActivate", "inventorySetQuantities", "productUpdate", "publishablePublish",
    ]);
    expect(mock.history).toHaveLength(1);
    expect(mock.history[0]).toMatchObject({ action: "edited" });
  });

  it("does not audit a save if Shopify cannot confirm the publication", async () => {
    mock.published = false;
    const response = await update(url);
    expect(response.status).toBe(422);
    expect(((await response.json()) as { error: string }).error).toContain("did not confirm");
    expect(mock.history).toHaveLength(0);
  });

  it("does not inflate total stock when editing a product stocked at another location", async () => {
    mock.quantity = 3;
    mock.otherLocationQuantity = 2;
    const response = await update(url, 3);
    expect(response.status).toBe(200);
    const body = await response.json() as { product: {
      variants: { nodes: Array<{
        inventoryQuantity: number;
        inventoryItem: { inventoryLevel: { quantities: Array<{ quantity: number }> } };
      }> };
    } };
    expect(body.product.variants.nodes[0].inventoryItem.inventoryLevel.quantities[0].quantity).toBe(3);
    expect(body.product.variants.nodes[0].inventoryQuantity).toBe(5);
    expect(mock.quantity).toBe(3);
    expect(mock.history).toHaveLength(1);
  });

  it("does not publish or audit when Shopify fails to reflect the requested location stock", async () => {
    mock.ignoreInventoryWrite = true;
    const response = await update(url);
    expect(response.status).toBe(422);
    expect(((await response.json()) as { error: string }).error).toContain("did not confirm stock");
    expect(mock.calls).not.toContain("publishablePublish");
    expect(mock.history).toHaveLength(0);
  });

  it("does not overwrite stock changed at the managed location since the form loaded", async () => {
    mock.quantity = 4;
    mock.otherLocationQuantity = 2;
    const response = await update(url, 3);
    expect(response.status).toBe(422);
    expect(((await response.json()) as { error: string }).error).toContain("Stock at the managed");
    expect(mock.calls).not.toContain("inventorySetQuantities");
    expect(mock.history).toHaveLength(0);
  });
});