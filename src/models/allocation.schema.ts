import { Schema, model } from "mongoose";
import { IAllocation } from "../types/allocation";

const allocationSchema = new Schema<IAllocation>({
    walletAddress:{
        type: String,
        required: true
    },
    campaigns: [{
        name: {
            type: String, 
            enum: ["collaborations","discord","pacifictidebot","pacificacampaign"],
            required: true
        },
        mint: {
            type: String,
            enum: ["fcfs","gtd"],
            required: true
        },
        amount: {
            type: Number,
            required: true,
        }
    }]
});

export const AllocationModel = model<IAllocation>("Allocation", allocationSchema);