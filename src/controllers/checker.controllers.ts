import { Request, Response } from "express";
import { IAllocation } from "../types/allocation.js";
import { CheckerService } from "../services/checker.services.js";
import { checkerUISchema } from "../validations/checker.zod.js";
import "dotenv/config";

export class CheckerController {

  static async allocation(req: Request, res: Response): Promise<void> {
    try {
      const bodyParsing = await checkerUISchema.safeParse(req.body);

      if(!bodyParsing.success){
        res.status(400).json({error: "Invalid Input."});
        return;
      }

      const walletAddress = bodyParsing.data.walletAddress;
      console.log(`${walletAddress} is using the Checker`)
      const allocation: IAllocation | null = await CheckerService.fetchAllocation(walletAddress); 
      res.status(200).json(allocation);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  }
}
