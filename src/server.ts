import express from "express";
import helmet from "helmet";
import "dotenv/config"
import cookieParser from "cookie-parser";
import masterRoutes from "./routes/index.routes";
import { connectDB } from "./config/db.config";
import path from "path";
import rateLimit from "express-rate-limit";

export const app = express();
const PORT: number = Number(process.env.PORT) || 3000;

if (process.env.NODE_ENV !== 'test') {
    connectDB();
}

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 25,
    message: {
        success: false,
        error: "Too many requests from this IP, please try again after 15 minutes."
    },
    standardHeaders: true, 
    legacyHeaders: false, 
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "./views"));
app.use(express.static(path.join(__dirname, "./public")));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// app.use(helmet());
app.use(cookieParser())

app.use("/", authLimiter);

app.use("/", masterRoutes);

app.get('/ping', (req, res)=>{
    res.send("pong")
})

app.listen(PORT, ()=>{
    console.log(`Server is running on PORT:${PORT}`);
})



