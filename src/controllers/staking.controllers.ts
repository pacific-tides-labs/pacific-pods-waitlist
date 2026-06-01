import { Request, Response } from "express";
import { StakingService } from "../services/staking.services";
import { stakingUISchema } from "../validations/staking.zod";
import { IStaking } from "../types/staking";

export class StakingController {
    
    // GET /api/staking?walletAddress=0x...
    static async getUserStakingData(req: Request, res: Response): Promise<void> {
        try {
            const walletAddress = req.query.walletAddress as string;
            if (!walletAddress || walletAddress.length !== 42) {
                res.status(400).json({ error: "Missing or invalid wallet address." });
                return;
            }
            
            const profile = await StakingService.fetchUserStakingProfile(walletAddress);
            res.status(200).json(profile);
        } catch (err) {
            res.status(500).json({ error: String(err) });
        }
    }

    // POST /api/staking
    static async staking(req: Request, res: Response): Promise<void> {
        try {
            const bodyParsing = stakingUISchema.safeParse(req.body);
            if (!bodyParsing.success) {
                res.status(400).json({ success: false, error: "Invalid Input Data." });
                return;
            }

            const response = await StakingService.processStakingRequest(
                bodyParsing.data as Omit<IStaking, 'status' | 'points' | 'startTime'>
            );
            if (!response.success) {
                res.status(response.status).json({ error: response.message });
                return;
            }

            res.status(response.status).json(response.allocation);
        } catch (err) {
            res.status(500).json({ error: String(err) });
        }
    }

    // DELETE /api/staking
    static async unstake(req: Request, res: Response): Promise<void> {
        try {
            const { walletAddress, tokenId } = req.body;
            if (!walletAddress || !tokenId) {
                res.status(400).json({ error: "Wallet and Token ID required." });
                return;
            }

            const response = await StakingService.removeSoftStake(walletAddress, Number(tokenId));
            if (!response.success) {
                res.status(response.status).json({ error: response.message });
                return;
            }

            res.status(200).json({ success: true, message: "Unstaked successfully" });
        } catch (err) {
            res.status(500).json({ error: String(err) });
        }
    }
}
