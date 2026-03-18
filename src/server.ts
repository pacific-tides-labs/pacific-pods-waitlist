import express from "express";
import "dotenv/config";
import cookieParser from "cookie-parser";
import masterRoutes from "./routes/index.routes";
import { connectDB } from "./config/db.config";
import path from "path";
import rateLimit from "express-rate-limit";

export const app = express();
const PORT: number = Number(process.env.PORT) || 3000;

// Connect DB only if not in test mode
if (process.env.NODE_ENV !== 'test') {
    connectDB();
}

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        success: false,
        error: "Too many requests from this IP, please try again after 15 minutes."
    },
    standardHeaders: true, 
    legacyHeaders: false, 
});

app.set('trust proxy', 1);

// FIX: Use process.cwd() for Vercel paths
app.set("view engine", "ejs");
app.set("views", path.join(process.cwd(), "src", "views"));
app.use(express.static(path.join(process.cwd(), "src", "public")));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Apply limiter to API only (avoid locking out the home page)
app.use("/api/auth", authLimiter);

app.use("/", masterRoutes);

app.get('/ping', (req, res) => {
    res.send("pong");
});

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Server is running on PORT:${PORT}`);
    });
}

export default app;
