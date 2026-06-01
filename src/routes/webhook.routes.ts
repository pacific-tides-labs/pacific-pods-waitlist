import { Router } from "express";
import { WebhookController } from "../controllers/webhook.controllers.js";

const router = Router();

router.post("/alchemy", WebhookController.processAlchemyNotification);

export default router;