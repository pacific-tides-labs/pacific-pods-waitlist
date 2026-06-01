import { StakingRepository } from "../repositories/staking.repository";
import { IStaking } from "../types/staking";

export type ServiceResponse = {
    status: number;
    success: boolean;
    allocation?: any;
    message?: string;
};

export class StakingService {
    
    // ==========================================
    // THE CORE TOKENOMICS ENGINE
    // ==========================================
    
    // Maps a Token ID to its daily base yield based on Rarity
    private static getPodRarityBaseYield(tokenId: number): number {
        // TODO: Map your 333 token IDs to their exact rarities here.
        // Example: if (legendaryIds.includes(tokenId)) return 55.0;
        
        // Defaulting to Common (10.0 points/day) for now
        return 10.0; 
    }

    private static calculatePendingPoints(startTime: number, duration: number, stakeType: 'SOFT' | 'LOCKED', tokenId: number): number {
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const secondsStaked = Math.max(0, currentTimestamp - startTime);
        
        // 1. Get Base Daily Points
        let baseDailyPoints = this.getPodRarityBaseYield(tokenId);

        // 2. Apply Soft Stake -90% Penalty (Divide by 10)
        if (stakeType === 'SOFT') {
            baseDailyPoints = baseDailyPoints / 10;
        }

        // 3. Apply Multipliers (ONLY if LOCKED)
        let multiplier = 1.0;
        if (stakeType === 'LOCKED') {
            if (duration === 180) multiplier = 2.5;
            else if (duration === 90) multiplier = 2.0;
            else if (duration === 30) multiplier = 1.5;
            else if (duration === 7) multiplier = 1.0;
        }

        // 4. Convert Daily Points to Points-Per-Second for live tracking
        const pointsPerSecond = (baseDailyPoints * multiplier) / 86400;

        return secondsStaked * pointsPerSecond;
    }

    // ==========================================
    // READ ONLY: Fetching for the Dashboard UI
    // ==========================================
    static async fetchUserStakingProfile(walletAddress: string) {
        const activeStakes = await StakingRepository.getActiveStakesByWallet(walletAddress);
        const bankedPoints = await StakingRepository.getTotalBankedPoints(walletAddress);

        let livePendingPoints = 0;
        const softStakedTokens: number[] = [];

        for (const stake of activeStakes) {
            softStakedTokens.push(stake.tokenId);
            // Execute exact math logic
            livePendingPoints += this.calculatePendingPoints(stake.startTime, stake.duration, stake.stake, stake.tokenId);
        }

        return {
            totalPoints: bankedPoints + livePendingPoints,
            softStakedTokens
        };
    }

    // ==========================================
    // WRITE OPERATIONS
    // ==========================================
    static async processStakingRequest(input: Omit<IStaking, 'points' | 'startTime' | 'status'>): Promise<ServiceResponse> {
        const currentActiveStake = await StakingRepository.findActiveStakeByTokenId(input.tokenId);
        
        if (currentActiveStake) {
            return { status: 400, success: false, message: `Pod #${input.tokenId} is already active.` };
        }

        const instantiatedRecord = await StakingRepository.createNewStakeRecord({
            walletAddress: input.walletAddress.toLowerCase(),
            tokenId: input.tokenId,
            duration: input.duration,
            stake: input.stake,
            points: 0,
            startTime: Math.floor(Date.now() / 1000),
            status: 'ACTIVE'
        });

        return { status: 201, success: true, allocation: instantiatedRecord.toObject() };
    }

    static async removeSoftStake(walletAddress: string, tokenId: number): Promise<ServiceResponse> {
        const stakeRecord = await StakingRepository.findActiveStakeByTokenId(tokenId);
        
        if (!stakeRecord || stakeRecord.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
            return { status: 400, success: false, message: "No active soft stake found." };
        }

        // Lock in the exact mathematical final points
        const finalEarnedPoints = this.calculatePendingPoints(stakeRecord.startTime, stakeRecord.duration, stakeRecord.stake, stakeRecord.tokenId);
        
        await StakingRepository.removeStakeAndBankPoints(tokenId, finalEarnedPoints);
        
        return { status: 200, success: true };
    }
}