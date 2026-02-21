import mongoose from "mongoose";
import "dotenv/config"

export const connectDB = async ()=>{
    try{
       await mongoose.connect(process.env.MONGO_URI!)
       .then(()=>{
        console.log("✅ Connected to Database");
       });
    }
    catch(err){
        console.error(err);
        process.exit(1);
    }
}