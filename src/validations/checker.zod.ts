import { z } from "zod";

// Checker User Input Schema
export const checkerUISchema = z.object({
    walletAddress: z.string().length(42),
}).strict();