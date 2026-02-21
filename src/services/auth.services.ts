import bcrypt from "bcrypt";
import { IUser } from "../types/user";
import { UserRepository } from "../repositories/auth.repository";
import { JWT } from "../utils/jwt.util";

export class AuthService {
    static async registerUser(user: IUser): Promise<string | null> {
        const existingUser: IUser | null  = await UserRepository.findByEmail(user.email);
        if(existingUser){
            return null;
        }

        const hash = await bcrypt.hash(user.password, 10);
        const newUser: IUser | null = await UserRepository.register({...user, password: hash});
        if(!newUser) throw new Error("User registration failed!");

        return JWT.sign({ email: newUser.email });

    }

    static async loginUser(user: IUser): Promise<string | null> {
        const existingUser: IUser | null = await UserRepository.findByEmail(user.email);
        if(!existingUser){
            return null;
        }

        const isMatch: boolean = await bcrypt.compare(user.password, existingUser.password);

        if(isMatch){
            return JWT.sign({ email: existingUser.email});
        }
        else{
            return null;
        }
    }
}