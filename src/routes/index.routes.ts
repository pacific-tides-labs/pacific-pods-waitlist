import { Router } from "express";
import authRoutes from "./auth.routes"
import { AuthController } from "../controllers/auth.controllers"

const router = Router()

router.use("/api/auth", authRoutes);
router.get("/", AuthController.root);

export default router