import { Router } from "express";
import authRoutes from "./auth.routes"
import checkerRoutes from "./checker.routes"
import stakeRoutes from "./staking.routes";
import webhookRoutes from "./webhook.routes";
import { AuthController } from "../controllers/auth.controllers"

const router = Router()

router.use("/api/auth", authRoutes);
router.use("/api/checker", checkerRoutes);
router.use("/api/staking", stakeRoutes);
router.use("/api/webhooks", webhookRoutes);
router.get("/", AuthController.root);
export default router
