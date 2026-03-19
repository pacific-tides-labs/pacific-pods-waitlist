import { Request, Response } from "express";
import { IUser } from "../types/user";
import { AuthService } from "../services/auth.services";
import { userVRSchema, userVLSchema } from "../validations/user.zod";
import "dotenv/config";

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      if(process.env.STATUS == "down"){
        console.log("Bots Attacking...")
        res.status(410).json({error:"Gone"});
        return;
      }
      
      const result = userVRSchema.safeParse(req.body);

      if (result.success) {
        const user: Omit<IUser, "score"> = result.data;
        const response = await AuthService.registerUser(user);

        if (response.status === 201 && response.token && response.newUser) {
          res.cookie("token", response.token);

          const user: IUser = {
            email: response.newUser.email,
            walletAddress: response.newUser.walletAddress,
            xUsername: response.newUser.xUsername,
            referral: response.newUser.referral,
            score: response.newUser.score
          };

          res.status(201).json({ success:true, user, message: response.message });
        } else {
          res.status(response.status).json({ message: response.message });
        }
      } else {
        res.status(400).json({ error: "Bad Request", details: result.error });
      }
    } catch (err) {
      res.status(500).json({ message: String(err) });
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      console.log("Logging in.")
      const result = userVLSchema.safeParse(req.body);
      if (result.success) {
        const user: Omit<IUser, "email" | "xUsername" | "score"> = result.data;
        const search = await AuthService.loginUser(user);

        if(!search){ 
            res.status(401).json({ error: "Invalid Credentials" });
            return
        }

        if (!search.token || !search.user) {
          res.status(401).json({ error: "Invalid Credentials" });
          return;
        }

        res.cookie("token", search.token);
        res.status(200).json({
            success:true,
            message: "User logged-in successfully.",
            user: search.user,
        });
    } else {
          res.status(400).json({ error: "Invalid Request Format" });
        }
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  }

  static async root(req: Request, res: Response): Promise<void> {
    try {
      let file = "close.ejs";
      if(process.env.STATUS == "up") file = "index.ejs";
      
      const token = req.cookies.token;
      const userDoc = await AuthService.fetchUser(token);

      if (!token) {
        return res.status(200).render(file, { valid: false });
      }

      if (!userDoc) {
        res.clearCookie("token");
        return res.status(200).render(file, { valid: false });
      }

      const user: IUser = {
        email: userDoc.email,
        walletAddress: userDoc.walletAddress,
        xUsername: userDoc.xUsername,
        referral: userDoc.referral,
        score: userDoc.score
      };

      res.status(200).render(file, { ...user , valid: true });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  }
}
