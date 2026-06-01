import { Router } from "express";
import authRoutes from "./auth.routes.js"
import checkerRoutes from "./checker.routes.js"
import stakeRoutes from "./staking.routes.js";
import webhookRoutes from "./webhook.routes.js";
import { AuthController } from "../controllers/auth.controllers.js"

const router = Router()

router.use("/api/auth", authRoutes);
router.use("/api/checker", checkerRoutes);
router.use("/api/staking", stakeRoutes);
router.use("/api/webhooks", webhookRoutes);
router.get("/", AuthController.root);
export default router
