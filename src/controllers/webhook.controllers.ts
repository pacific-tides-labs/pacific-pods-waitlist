import { Request, Response } from "express";
import { WebhookService } from "../services/webhook.services.js";

export class WebhookController {
    static async processAlchemyNotification(req: Request, res: Response): Promise<void> {
        try {
            const { event } = req.body;
            
            // 1. Validate the payload structural integrity from Alchemy
            if (!event || !event.activity || event.activity.length === 0) {
                res.status(200).send("Empty payload received.");
                return;
            }

            // 2. Loop through every transfer event inside this specific Ethereum block
            for (const activity of event.activity) {
                const fromAddress = activity.fromAddress;
                
                // Alchemy sends Token IDs as Hex strings (e.g., "0x1a"). Convert to base-10 number.
                const tokenId = parseInt(activity.erc721TokenId, 16); 
                
                // Convert Alchemy's ISO block time to a UNIX timestamp in seconds
                const blockTimestamp = Math.floor(new Date(event.blockDatetime).getTime() / 1000);

                // 3. Pass valid transfers to the service layer for processing
                if (fromAddress && !isNaN(tokenId)) {
                    await WebhookService.handleAlchemyTransfer(fromAddress, tokenId, blockTimestamp);
                }
            }

            // 4. ALWAYS send 200 OK back to Alchemy so they don't retry the request
            res.status(200).json({ success: true });

        } catch (error) {
            console.error("Webhook processing failure:", error);
            // Even on internal error, return 200 to Alchemy to stop webhook spam loops
            res.status(200).json({ error: "Internal processing error, but received." });
        }
    }
}