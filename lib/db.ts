// db.ts
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI is not defined in environment variables.");

declare global {
  var _mongoose: typeof mongoose | undefined;
}

// Connection function
const connectToDatabase = async () => {
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
    })
    .catch((err) => {
      console.error("❌ MongoDB Connection Error:", err);
      throw err;
    });

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
});

// Gracefully close connection on process termination
process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("🔴 MongoDB connection closed due to app termination");
  process.exit(0);
});

const executeWithRetry = async <T>(
  operation: () => Promise<T>, 
  maxRetries = 2,
  retryDelay = 1000
): Promise<T> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      console.error(`Database operation attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      
      // For timeout/buffering errors, try to reconnect
      if (error.message.includes('timeout') || error.message.includes('buffering')) {
        try {
          // Force a fresh connection
          if (global._mongoose) {
            await global._mongoose.connection.close();
            global._mongoose = undefined;
          }
          await connectToDatabase();
        } catch (reconnectError) {
          console.error('Reconnection failed:', reconnectError);
        }
      }
    }
  }
  throw new Error('All retry attempts exhausted');
};

export { connectToDatabase, executeWithRetry };
