import { afterEach, describe, expect, it, vi } from "vitest";
import { ObjectStorageService } from "./objectStorage";

describe("ObjectStorageService.deleteObjectEntity", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.PRIVATE_OBJECT_DIR;
  });

  it("signs and sends a DELETE request for the object path", async () => {
    process.env.PRIVATE_OBJECT_DIR = "/bucket/private";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ signed_url: "https://signed.example/delete" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await new ObjectStorageService().deleteObjectEntity(
      "/objects/uploads/product-photo",
    );

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://127.0.0.1:1106/object-storage/signed-object-url",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"object_name":"private/uploads/product-photo"'),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://signed.example/delete",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("treats an already missing object as cleaned up", async () => {
    process.env.PRIVATE_OBJECT_DIR = "/bucket/private";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ signed_url: "https://signed.example/delete" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      new ObjectStorageService().deleteObjectEntity(
        "/objects/uploads/missing-photo",
      ),
    ).resolves.toBeUndefined();
  });
});