import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;

if (!uri) throw new Error("MONGODB_URI is not defined in environment variables.");

declare global {
  var _mongoosePromise: Promise<typeof mongoose> | undefined;
}

// Connection function
const connectToDatabase = async () => {
  if (global._mongoosePromise) return global._mongoosePromise;

  global._mongoosePromise = mongoose
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

  return global._mongoosePromise;
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

export { connectToDatabase };
