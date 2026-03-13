import { HydratedDocument } from "mongoose";
import { UserModel } from "../models/user.schema";
import { IUser } from "../types/user";

export class UserRepository {
  // Fixed: findOne returns a single document, not an array.
  static async find(
    walletAddress: string,
    email: string,
    xUsername: string,
  ): Promise<HydratedDocument<IUser> | null> {
    try {
      return await UserModel.findOne({
        $or: [{ email }, { walletAddress }, { xUsername }],
      });
    } catch (err) {
      throw new Error(`Failed to find user: ${err}`);
    }
  }

  static async register(user: Omit<IUser, "score">): Promise<IUser | null> {
    try {
      return await UserModel.create({
        email: user.email,
        walletAddress: user.walletAddress,
        xUsername: user.xUsername,
        ...(user.referral && { referral: user.referral }),
      });
    } catch (err) {
      throw new Error(`Failed to create user: ${err}`);
    }
  }

  static async findReferral(referral: string): Promise<IUser | null> {
    try {
      const referralQuery = await UserModel.findOne({ referral });
      if (referralQuery) {
        await UserModel.updateOne({ referral }, { $inc: { score: 1 } });
      }
      return referralQuery;
    } catch (err) {
      throw new Error(`Failed to process referral: ${err}`);
    }
  }

  static async findOne(walletAddress: string): Promise<IUser | null> {
    try {
      return await UserModel.findOne({ walletAddress });
    } catch (err) {
      throw new Error(`Failed to find user: ${err}`);
    }
  }
}
