import { Router } from "express";
import { CheckerController } from "../controllers/checker.controllers"

const router = Router()

router.post("/allocation", CheckerController.allocation);

export default router