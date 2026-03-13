import { Schema, model } from "mongoose";
import { IUser } from "../types/user";

const userSchema = new Schema<IUser>({
    email: {
        type: String, 
        required: true, 
        unique: true
    },
    walletAddress: {
        type: String, 
        required: true, 
        unique: true
    },
    xUsername: {
        type: String,
        required: true, 
        unique: true
    },
    referral: {
        type: String,
        default: null
    },
    score: {
        type: Number,
        default: 0
    }
});

export const UserModel = model<IUser>("User", userSchema);