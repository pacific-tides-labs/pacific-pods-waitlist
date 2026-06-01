import { IAllocation } from "../types/allocation.js";
import { CheckerRepository } from "../repositories/checker.repository.js";

// Define a standard return type for the service
export type ServiceResponse = {
  status: number;
  allocation?: IAllocation;
  message?: string;
};

export class CheckerService {

  static async fetchAllocation(walletAddress: string): Promise<IAllocation | null> {
    try {
      const allocation: IAllocation | null = await CheckerRepository.queryAllocation(walletAddress);
      return allocation;
    } catch (err) {
      return null;
    }
  }

}
