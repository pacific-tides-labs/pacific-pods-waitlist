import { Request, Response } from "express";
import { StakingService } from "../services/staking.services.js";

export class WebhookController {
    static async processAlchemyNotification(req: Request, res: Response): Promise<void> {
        try {
            const { event } = req.body;
            
            if (!event) {
                res.status(200).send("No event structure found.");
                return;
            }

            // Alchemy sometimes puts the payload directly in `event`, 
            // and sometimes inside an `event.activity` array depending on if you picked 
            // "Custom Webhook" or "Address Activity". This safely normalizes both!
            const activities = event.activity ? event.activity : [event];

            for (const activity of activities) {
                // Ignore ERC-1155s, ERC-20s, and raw ETH. We only care about your ERC-721 Pods.
                if (activity.category !== "erc721") continue;

                const fromAddress = activity.fromAddress;
                
                // For ERC-721, Alchemy passes the Token ID directly on the object. No arrays.
                let tokenIdHex = activity.erc721TokenId; 

                if (!tokenIdHex) continue;

                // Strip the '0x' prefix and parse it to a standard base-10 number (e.g. "0x1A" -> 26)
                if (tokenIdHex.startsWith("0x")) {
                    tokenIdHex = tokenIdHex.slice(2);
                }
                const tokenId = parseInt(tokenIdHex, 16);

                if (fromAddress && !isNaN(tokenId)) {
                    // 🔥 Send it straight to the core math engine we built
                    await StakingService.removeSoftStake(fromAddress, tokenId);
                    console.log(`[ALCHEMY WATCHDOG] Processed PacificPod #${tokenId} transfer from ${fromAddress}`);
                }
            }

            // ALWAYS instantly respond 200 OK so Alchemy marks the delivery as successful
            res.status(200).json({ success: true });

        } catch (error) {
            console.error("Alchemy Webhook Processing Failure:", error);
            // Fallback 200 to prevent webhook delivery fail loops on Alchemy's end
            res.status(200).json({ error: "Internal engine error, but acknowledged." });
        }
    }
}
