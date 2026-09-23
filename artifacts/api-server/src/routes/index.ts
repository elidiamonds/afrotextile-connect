import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productsRouter from "./products";
import vendorsRouter from "./vendors";
import ordersRouter from "./orders";
import storageRouter from "./storage";
import shopifyRouter from "./shopify";
import shopifyVendorCatalogRouter from "./shopifyVendorCatalog";

const router: IRouter = Router();

router.use(healthRouter);
router.use(productsRouter);
router.use(vendorsRouter);
router.use(ordersRouter);
router.use(storageRouter);
router.use(shopifyRouter);
router.use(shopifyVendorCatalogRouter);

export default router;
