import { Schema, model, Document, HydratedDocument } from "mongoose";
import { IStaking } from "../types/staking.js";

export type StakingDocument = HydratedDocument<IStaking>;

const StakingSchema = new Schema<IStaking>({
    walletAddress: { 
        type: String, 
        required: true, 
        lowercase: true,
        index: true 
    },
    tokenId: { 
        type: Number, 
        required: true 
    },
    duration: { 
        type: Number, 
        required: true, 
        enum: [7, 30, 90, 180] 
    },
    points: { 
        type: Number, 
        required: true, 
        default: 0 
    },
    startTime: { 
        type: Number, 
        required: true, 
        default: () => Math.floor(Date.now() / 1000) 
    },
    status: { 
        type: String, 
        required: true, 
        enum: ['ACTIVE', 'UNSTAKED', 'COMPLETED'], 
        default: 'ACTIVE' 
    },
    stake: { 
        type: String, 
        required: true, 
        enum: ['SOFT', 'LOCKED'], 
        default: 'SOFT' 
    }
}, {
    timestamps: true
});

StakingSchema.index(
    { tokenId: 1 },
    { unique: true, partialFilterExpression: { status: "ACTIVE" } }
);

export const StakingModel = model<IStaking>("Staking", StakingSchema);