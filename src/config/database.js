const mongoose = require("mongoose")

const connectDb = async()=>{
    try {
        if (!process.env.MONGODB_URL) {
            throw new Error("MONGODB_URL is not defined in the environment variables.");
        }
        await mongoose.connect(process.env.MONGODB_URL) ;
        console.log("connected to database")
    } catch (error) {
        console.error("❌ Database connection failed:", error.message);
        throw error;
    }
}

module.exports = connectDb;