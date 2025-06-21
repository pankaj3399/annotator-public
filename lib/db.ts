// lib/db.ts
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI is not defined in environment variables.");

declare global {
  var _mongoose: typeof mongoose | undefined;
}

// 🧪 ERROR SIMULATION TOGGLE - Set to false for production
// const SIMULATE_DB_ERRORS = false; // Change this to true to test error handling

// Connection function
const connectToDatabase = async () => {
  // Error simulation for testing - only runs when SIMULATE_DB_ERRORS is true
  // if (SIMULATE_DB_ERRORS && Math.random() < 0.3) {
  //   const errors = [
  //     new Error("MongooseError: Operation templates.findOne() buffering timed out after 10000ms"),
  //     new Error("Database connection timeout - please refresh the page"),
  //     new Error("MongoDB connection failed - temporary network issue"),
  //     new Error("Database server temporarily unavailable"),
  //     new Error("Connection pool exhausted - please try again"),
  //     new Error("MongooseError: Operation projects.find() buffering timed out after 10000ms"),
  //   ];
  //   const selectedError = errors[Math.floor(Math.random() * errors.length)];
  //   console.log("🔥 SIMULATING ERROR:", selectedError.message);
  //   throw selectedError;
  // }

  if (global._mongoose) return global._mongoose; // Return existing connection
  
  global._mongoose = await mongoose
    .connect(uri, {
      minPoolSize: parseInt(process.env.MIN_CONNECTION_MONGO || "5", 10),
      maxPoolSize: parseInt(process.env.MAX_CONNECTION_MONGO || "70", 10),
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    })
    .then((m) => {
      console.log("✅ MongoDB connected successfully");
      return m;
    });
    // No .catch() here - let real errors bubble up to ErrorBoundary
    
  return global._mongoose;
};

// Handle connection events
mongoose.connection.on("connected", () => {
  console.log("🟢 Mongoose connected to DB");
});

mongoose.connection.on("disconnected", () => {
  console.log("🟡 Mongoose disconnected");
});

mongoose.connection.on("error", (err) => {
  console.error("🔴 Mongoose connection error:", err);
  // Don't throw here, just log
});

// Gracefully close connection on process termination
process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("🔴 MongoDB connection closed due to app termination");
  process.exit(0);
});

export { connectToDatabase };