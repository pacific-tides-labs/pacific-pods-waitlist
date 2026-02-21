import { Request, Response } from "express";
import { IUser } from "../types/user";
import { AuthService } from "../services/auth.services";
import { userVSchema } from "../validations/user.zod";

export class AuthController {
    static async register(req: Request, res: Response): Promise<void> {
        try{
            console.log(req.body)
            const result = userVSchema.safeParse(req.body);
            if(result.success){
                const user: IUser = result.data
                const token = await AuthService.registerUser(user);

                if(!token){
                    res.status(200).json({ message: "Error: Invalid Email or Password."})
                }

                res.cookie("token",token);
                res.status(201).json({
                    message: "User registered successfully.", 
                    token
                })
            }
            else{
                res.status(400).json({ error: "Bad Request"})
            }
        }
        catch(err){
            res.status(500).json({
                message: String(err)
            })
        }
    }

    static async login(req: Request, res: Response): Promise<void>{
        try{
            const result = userVSchema.safeParse(req.body);
            if(result.success){
                const user: IUser = result.data
                const token = await AuthService.loginUser(user);

                if(!token){
                    res.status(401).json({ error: "Invalid Email or Password" })
                }

                res.cookie("token",token);
                res.status(200).json({
                    message: "User logged-in successfully.", 
                    token
                })
            }
            else{
               res.status(400).json({ error: "Invalid Email or Password" })
            }
        }
        catch(err){
            res.status(500).json({
                error: String(err)
            })
        }
    }
} 