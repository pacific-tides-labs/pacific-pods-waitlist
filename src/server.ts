import express from "express";
import helmet from "helmet";
import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import masterRoutes from "./routes/index.routes";
import { connectDB } from "./config/db.config";
import path from "path";
import rateLimit from "express-rate-limit";

const allowedOrigins = ['http://localhost:4000', 'http://localhost:3000', 'https://pacificpod.xyz', 'https://www.pacificpod.xyz'];

export const app = express();
const PORT: number = Number(process.env.PORT) || 3000;

if (process.env.NODE_ENV !== 'test') {
    connectDB();
}

// const authLimiter = rateLimit({
//     windowMs: 15 * 60 * 1000,
//     max: 30,
//     message: {
//         success: false,
//         error: "Too many requests from this IP, please try again after 15 minutes."
//     },
//     standardHeaders: true, 
//     legacyHeaders: false, 
// });

const corsOptions: cors.CorsOptions = {
  origin: (origin: any, callback: any) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST'], // Allowed HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization'], // Allowed headers
//   credentials: true, // Allow cookies/authorization headers to be sent
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};
const frontendDistPath = path.join(__dirname, "../frontend/dist");

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../src/views"));

app.use("/checker", express.static(frontendDistPath));
app.use(express.static(path.join(__dirname, "../src/public")));
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// app.use(helmet());
app.use(cookieParser())

// app.use("/", authLimiter);

app.use("/", masterRoutes);

app.get("/checker/*any", (req, res) => {
    res.sendFile(path.join(frontendDistPath, "index.html"));
});

app.get('/ping', (req, res)=>{
    res.send("pong")
})

app.listen(PORT, ()=>{
    console.log(`Server is running on PORT:${PORT}`);
})



