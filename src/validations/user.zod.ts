import { z } from "zod";

export const userVSchema = z.object({
    email: z.string(), 
    password: z.string()
}).strict();