import { StakingRepository } from "../repositories/staking.repository.js";

export class WebhookService {
    // Base rate: 1 $TIDES point per second (Adjust this to your actual tokenomics)
    private static BASE_REWARD_RATE = 1;

    static async handleAlchemyTransfer(fromAddress: string, tokenId: number, blockTimestamp: number): Promise<boolean> {
        try {
            // 1. Check if the transferred Pod was actually active in our staking system
            const stakeRecord = await StakingRepository.findActiveStakeByTokenId(tokenId);
            
            // If it wasn't staked, or the sender isn't the one who staked it, ignore the transfer
            if (!stakeRecord || stakeRecord.walletAddress.toLowerCase() !== fromAddress.toLowerCase()) {
                return false; 
            }

            // 2. Calculate the exact time staked up to the blockchain block timestamp
            const secondsStaked = blockTimestamp - stakeRecord.startTime;

            // Optional: Add duration multipliers (e.g., 180 days gets 2x points)
            let multiplier = 1.0;
            if (stakeRecord.duration === 180) multiplier = 2.0;
            else if (stakeRecord.duration === 90) multiplier = 1.5;
            else if (stakeRecord.duration === 30) multiplier = 1.2;

            // 3. Calculate final points (ensure it never goes negative)
            const finalPointsToBank = Math.max(0, secondsStaked * this.BASE_REWARD_RATE * multiplier);

            // 4. Update the database to freeze the points and release the active token lock
            await StakingRepository.removeStakeAndBankPoints(tokenId, finalPointsToBank);
            
            console.log(`[WATCHDOG] Pod #${tokenId} sold by ${fromAddress}. Banked ${finalPointsToBank} points. Status: UNSTAKED.`);
            return true;

        } catch (error) {
            console.error(`[WATCHDOG ERROR] Failed to process transfer for Pod #${tokenId}:`, error);
            return false;
        }
    }
}