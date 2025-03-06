import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { config } from "dotenv";

// Set up environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, "..", ".env.local") });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("Please define the MONGODB_URI environment variable inside .env");
  process.exit(1);
}

// Define schemas
const customFieldSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    label: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["text", "link", "file", "array"],
      required: true,
    },
    isRequired: {
      type: Boolean,
      default: false,
    },
    acceptedFileTypes: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    forAllTeams: {
      type: Boolean,
      default: false,
    },
    teams: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
    }],
    created_at: {
      type: Date,
      default: Date.now,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      default: null,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      }
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    created_at: {
      type: Date,
      default: Date.now,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

// Define models
const CustomField = mongoose.models.CustomField || mongoose.model("CustomField", customFieldSchema);
const Team = mongoose.models.Team || mongoose.model("Team", teamSchema);

// Migration function
async function updateCustomFieldsWithForAllTeams() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");

    // Get all active teams
    const teams = await Team.find();
    console.log(`Found ${teams.length} active teams`);

    // Get all existing custom fields
    const existingFields = await CustomField.find({});
    console.log(`Found ${existingFields.length} existing custom fields`);

    if (existingFields.length === 0) {
      console.log("No custom fields found to update. Migration completed.");
      return;
    }

    // Update all custom fields to set forAllTeams=true
    console.log("Setting forAllTeams=true for all existing custom fields...");
    
    const updateResults = await CustomField.updateMany(
      {}, // match all documents
      { 
        $set: { 
          forAllTeams: true,
          updated_at: new Date()
        } 
      }
    );

    console.log(`Updated ${updateResults.modifiedCount} custom fields`);
    console.log("All custom fields now have forAllTeams=true");

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Error during migration:", error);
    if (error.code === "ECONNREFUSED") {
      console.error(
        "Could not connect to MongoDB. Make sure your connection string is correct and MongoDB is running."
      );
    }
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Database connection closed");
    process.exit(0);
  }
}

// Run the migration
updateCustomFieldsWithForAllTeams();