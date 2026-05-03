import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import productsRouter from "./products";
import storeRouter from "./store";
import settingsRouter from "./settings";
import dashboardRouter from "./dashboard";
import salesRouter from "./sales";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/products", productsRouter);
router.use("/store", storeRouter);
router.use("/settings", settingsRouter);
router.use("/dashboard", dashboardRouter);
router.use("/sales", salesRouter);

export default router;
