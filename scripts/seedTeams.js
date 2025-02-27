import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { config } from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, "..", ".env.local") });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error(
    "Please define the MONGODB_URI environment variable inside .env"
  );
  process.exit(1);
}

// Team Schema Definition
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
    isActive: {
      type: Boolean,
      default: true,
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

const Team = mongoose.models.Team || mongoose.model("Team", teamSchema);

async function seedTeams() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");

    // Create a placeholder ObjectId for createdBy
    const placeholderId = new mongoose.Types.ObjectId();
    console.log(`Using placeholder ID for createdBy: ${placeholderId}`);

    // Create default teams
    const defaultTeams = [
      {
        name: "Freelancers",
        description: "Independent contractors working on various projects",
        createdBy: placeholderId,
        members: [],
      },
      {
        name: "Blomega Lab",
        description: "Research and development team focused on innovation",
        createdBy: placeholderId,
        members: [],
      },
      {
        name: "Acolad",
        description: "Translation and localization specialists",
        createdBy: placeholderId,
        members: [],
      },
      {
        name: "AWS",
        description: "Amazon Web Services development team",
        createdBy: placeholderId,
        members: [],
      },
      {
        name: "Cloudera",
        description: "Data platform specialists",
        createdBy: placeholderId,
        members: [],
      },
      {
        name: "G42",
        description: "AI and cloud computing team",
        createdBy: placeholderId,
        members: [],
        isActive: true,
      },
    ];

    console.log("Creating default teams...");
    for (const teamData of defaultTeams) {
      try {
        // Check if team already exists
        const existingTeam = await Team.findOne({ name: teamData.name });
        if (!existingTeam) {
          const team = await Team.create(teamData);
          console.log(`Created team: ${team.name}`);
        } else {
          console.log(`Team ${teamData.name} already exists, skipping creation`);
        }
      } catch (error) {
        console.error(`Error creating team ${teamData.name}:`, error);
        // Continue with other teams if one fails
      }
    }

    console.log("Teams collection seeded successfully!");
  } catch (error) {
    console.error("Error seeding teams collection:", error);
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

seedTeams();