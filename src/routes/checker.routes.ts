import { Router } from "express";
import { CheckerController } from "../controllers/checker.controllers.js"

const router = Router()

router.post("/allocation", CheckerController.allocation);

export default router
