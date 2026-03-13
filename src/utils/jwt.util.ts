import jwt from "jsonwebtoken";
import "dotenv/config";

type JWTUserPayload = {
  email: string;
  walletAddress: string;
  xUsername: string;
};

export class JWT {
  static sign(payload: JWTUserPayload): string {
    try {
      const token = jwt.sign(payload, process.env.JWT_SECRET!, {
        expiresIn: "24h",
      });
      return token;
    } catch (err) {
      throw new Error(`JWT signature failed: ${err}`);
    }
  }

  static verify(token: string): JWTUserPayload {
    try {
      return jwt.verify(token, process.env.JWT_SECRET!) as JWTUserPayload;
    } catch (err) {
      throw new Error(`JWT signature failed: ${err}`);
    }
  }
}
