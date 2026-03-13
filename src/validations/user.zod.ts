import { z } from "zod";

export const userVRSchema = z.object({
    email: z.string().email(), 
    walletAddress: z.string().length(42),
    xUsername: z.string().startsWith("https://x.com/"),
    referral: z.string().optional()
}).strict();

export const userVLSchema = z.object({
    walletAddress: z.string().length(42),
}).strict();