import mongoose from "mongoose";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Ensure MONGODB_URI is loaded
if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is not defined in the environment variables");
  process.exit(1);
}

// Template Schema definition in-house
const templateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
  content: { type: String, required: true },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    required: true,
  },
  timer: { type: Number, default: 0 },
  private: { type: Boolean, default: false },
  testTemplate: { type: Boolean, default: false },
  type: { type: String, enum: ["test", "training", "core"], default: "test" },
  groundTruthTask: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Task",
    required: false,
    default: null,
  },
});

const Template =
  mongoose.models?.Template || mongoose.model("Template", templateSchema);

async function migrate() {
  try {
    console.log("Connecting to database...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Database connected successfully");

    const templatesToUpdate = await Template.find({ type: { $exists: false } });
    console.log(`Found ${templatesToUpdate.length} templates to update`);

    if (templatesToUpdate.length === 0) {
      console.log(
        "No templates found without a type field. Migration not needed.",
      );
    } else {
      for (const template of templatesToUpdate) {
        template.type = "test";
        await template.save();
        console.log(`Updated template with ID: ${template._id}`);
      }
      console.log("Template migration completed successfully");
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error during template migration:", error);
    process.exit(1);
  }
}

// Handle uncaught promise rejections
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
  process.exit(1);
});

// Run the migration
migrate();
