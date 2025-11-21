import mongoose from "mongoose";

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/sharezone";

export const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    });
    console.log("✅ MongoDB Connected:", MONGO_URI.includes("localhost") ? "localhost" : "remote");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  }
};
