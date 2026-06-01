export type IStaking = {
    walletAddress: string,
    tokenId: number,
    duration: 7 | 30 | 90 | 180 // in days.
    points: number,
    startTime: number,
    status: 'ACTIVE' | 'UNSTAKED' | 'COMPLETED',
    stake: 'SOFT' | 'LOCKED'
}