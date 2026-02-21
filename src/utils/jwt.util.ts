import jwt from "jsonwebtoken"
import "dotenv/config"

export class JWT {
    static sign(payload: { email: string }): string{
        try{
            const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: "24h"});
            return token;
        }
        catch(err){
            throw new Error(`JWT signature failed: ${err}`);
        }
    }
}