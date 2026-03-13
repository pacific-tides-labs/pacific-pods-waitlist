export type IUser = {
    email: string;
    walletAddress: string;
    xUsername: string;
    referral?: string | undefined;
    score: number;
}