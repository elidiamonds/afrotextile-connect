import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ShopifyAdminError, shopifyAdminRequest } from "./shopifyAdminClient";

describe("Shopify Admin connector mutations", () => {
  beforeEach(() => {
    vi.stubEnv("REPLIT_CONNECTORS_HOSTNAME", "connector.example");
    vi.stubEnv("REPL_IDENTITY", "test-identity");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it.each([
    ["product update", "productUpdate", "userErrors"],
    ["variant creation", "productVariantsBulkCreate", "userErrors"],
    ["variant update", "productVariantsBulkUpdate", "userErrors"],
    ["inventory tracking", "inventoryItemUpdate", "userErrors"],
    ["inventory activation", "inventoryActivate", "userErrors"],
    ["inventory quantity", "inventorySetQuantities", "userErrors"],
    ["publication", "publishablePublish", "userErrors"],
    ["media reorder", "productReorderMedia", "mediaUserErrors"],
  ])("rejects %s errors before a caller can record success", async (_, operation, errorField) => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: {
        [operation]: { [errorField]: [{ field: ["input", "quantity"], message: "Rejected by Shopify" }] },
      } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(shopifyAdminRequest("mutation Test { operation }"))
      .rejects.toThrow(ShopifyAdminError);
    await expect(shopifyAdminRequest("mutation Test { operation }"))
      .rejects.toThrow("input.quantity: Rejected by Shopify");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v2/proxy/admin/api/2026-04/graphql.json"),
      expect.objectContaining({ headers: expect.objectContaining({ "Connector-Name": "shopify-store" }) }),
    );
  });

  it("returns mutation data only when Shopify reports no errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: { publishablePublish: { publishable: { publishedOnPublication: true }, userErrors: [] } },
      }),
    }));
    const result = await shopifyAdminRequest<{
      publishablePublish: { publishable: { publishedOnPublication: boolean }; userErrors: [] };
    }>("mutation Test { publishablePublish }");
    expect(result.publishablePublish.publishable.publishedOnPublication).toBe(true);
  });

  it("rejects top-level GraphQL errors even on HTTP 200", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ errors: [{ message: "Missing Shopify scope" }] }),
    }));
    await expect(shopifyAdminRequest("mutation Test { operation }"))
      .rejects.toThrow("Missing Shopify scope");
  });
});