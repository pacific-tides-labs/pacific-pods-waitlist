import { HydratedDocument } from "mongoose";
import { UserModel } from "../models/user.schema"
import { IUser } from "../types/user"

export class UserRepository {
    static async findByEmail(email: string): Promise<HydratedDocument<IUser> | null> {
        try{
            const userQuery: HydratedDocument<IUser> | null = await UserModel.findOne({ email });
    
            return userQuery;
        }
        catch(err: any){
            throw new Error(`Failed to find user`);
        }
    }

    static async register(user: IUser): Promise<IUser | null>{
        try{
            const document: IUser | null = await UserModel.create({
                email: user.email, 
                password: user.password
            })
    
            return document;
        }
        catch(err: any){
            throw new Error(`Failed to create user`)
        }
    }
}