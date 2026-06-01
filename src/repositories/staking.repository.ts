import { StakingModel, StakingDocument } from "../models/staking.schema";
import { IStaking } from "../types/staking";

export class StakingRepository {
    
    // Fetches all actively staked tokens for a specific user
    static async getActiveStakesByWallet(walletAddress: string): Promise<StakingDocument[]> {
        return await StakingModel.find({ 
            walletAddress: walletAddress.toLowerCase(), 
            status: "ACTIVE" 
        });
    }

    // Sums up all historically banked points for a user
    static async getTotalBankedPoints(walletAddress: string): Promise<number> {
        const records = await StakingModel.find({ walletAddress: walletAddress.toLowerCase() });
        return records.reduce((acc, curr) => acc + (curr.points || 0), 0);
    }

    static async findActiveStakeByTokenId(tokenId: number): Promise<StakingDocument | null> {
        return await StakingModel.findOne({ tokenId, status: "ACTIVE" });
    }

    static async createNewStakeRecord(stakeData: Partial<IStaking>): Promise<StakingDocument> {
        return await StakingModel.create(stakeData);
    }

    // Used by both the Webhook and the UI to safely close out a stake and save the points
    static async removeStakeAndBankPoints(tokenId: number, pointsEarned: number): Promise<void> {
        await StakingModel.updateOne(
            { tokenId: tokenId, status: "ACTIVE" },
            { 
                $set: { 
                    status: "UNSTAKED", 
                    points: pointsEarned 
                } 
            }
        );
    }
}
