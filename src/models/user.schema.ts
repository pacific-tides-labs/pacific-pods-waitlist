import { Schema, model } from "mongoose"
import { IUser } from "../types/user";

const userSchema = new Schema<IUser>({
    email: {
        type: String, 
        required: true, 
        unique: true
    },
    password: {
        type: String, 
        required: true, 
        unique: false
    }
})

export const UserModel = model<IUser>("User", userSchema);