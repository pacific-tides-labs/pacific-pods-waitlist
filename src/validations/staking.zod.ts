import { z } from "zod";

// Checker User Input Schema
export const stakingUISchema = z.object({
    walletAddress: z.string().length(42).startsWith("0x"),
    tokenId: z.number().min(1).max(333),
    duration: z.union([
        z.literal(7),
        z.literal(30),
        z.literal(90),
        z.literal(180)
    ]),
    stake: z.enum(["SOFT", "LOCKED"])
}).strict();