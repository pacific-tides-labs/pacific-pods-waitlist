import express from "express";
import helmet from "helmet";
import "dotenv/config"
import cookieParser from "cookie-parser";
import masterRoutes from "./routes/index.routes";
import { connectDB } from "./config/db.config";

export const app = express();
const PORT: number = Number(process.env.PORT) || 3000;

if (process.env.NODE_ENV !== 'test') {
    connectDB();
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(cookieParser())

app.use("/api", masterRoutes);

app.get("/", (req, res)=>{
    res.send("ping")
})


app.listen(PORT, ()=>{
    console.log(`Server is running on PORT:${PORT}`);
})



