import express from "express";
import { createServer, type Server } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import router, { objectStorageService } from "./storage";

async function startStorageServer(): Promise<{
  server: Server;
  url: string;
}> {
  const app = express();
  app.use(router);
  const server = createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Storage test server did not start on a TCP port.");
  }

  return {
    server,
    url: `http://127.0.0.1:${address.port}`,
  };
}

async function stopStorageServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

describe("GET /storage/objects/*path", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a quiet 404 when the provider reports a just-deleted object", async () => {
    vi.spyOn(objectStorageService, "getObjectEntityFile").mockResolvedValue(
      {} as never,
    );
    vi.spyOn(objectStorageService, "downloadObject").mockRejectedValue({
      code: 404,
      message: "No such object",
    });

    const { server, url } = await startStorageServer();
    try {
      const response = await fetch(`${url}/storage/objects/uploads/photo`);

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({
        error: "Object not found",
      });
    } finally {
      await stopStorageServer(server);
    }
  });
});