import { HydratedDocument } from "mongoose";
import { AllocationModel } from "../models/allocation.schema";
import { IAllocation } from "../types/allocation";

export class CheckerRepository {
  static async queryAllocation(
    walletAddress: string,
  ): Promise<HydratedDocument<IAllocation> | null> {
    try {
      function escapeRegex(text: string) {
        return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      }

      const safeWalletAddress = escapeRegex(walletAddress);
      const allocationData: HydratedDocument<IAllocation> | null = await AllocationModel.findOne({
        walletAddress: new RegExp(`^${safeWalletAddress}$`, 'i')
      });
      console.log(allocationData);
      return allocationData;
    } catch (err) {
      throw new Error(`Failed to find allocation for the user: ${err}`);
    }
  }
}
