import { Readable } from "stream";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  isObjectNotFoundError,
  objectStorageService,
} from "../lib/objectStorage";

const router: IRouter = Router();

router.get("/storage/objects/*path", async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectFile = await objectStorageService.getObjectEntityFile(
      `/objects/${wildcardPath}`,
    );
    const response = await objectStorageService.downloadObject(objectFile);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    if (response.body) {
      Readable.fromWeb(response.body as ReadableStream<Uint8Array>).pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (isObjectNotFoundError(error)) {
      res.status(404).json({ error: "Object not found" });
      return;
    }
    req.log.error({ err: error }, "Error serving object");
    res.status(500).json({ error: "Failed to serve object" });
  }
});

export { objectStorageService };
export default router;