import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  res.json({ status: "ok", debug: "v2-deployed", time: new Date().toISOString() });
});

export default router;
