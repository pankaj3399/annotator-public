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

// User Schema Definition
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    domain: [
      {
        type: String,
        default: [],
      },
    ],
    location: {
      type: String,
      default: null,
    },
    phone: {
      type: String,
      default: null,
    },
    isReadyToWork: {
      type: Boolean,
      default: false,
    },
    lang: [
      {
        type: String,
        default: [],
      },
    ],
    role: {
      type: String,
      enum: ["project manager", "annotator", "system admin"],
      required: true,
    },
    invitation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invitation",
      default: null,
    },
    enrolledCourses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "EnrolledCourse",
      },
    ],
    linkedin: {
      type: String,
      default: null,
    },
    resume: {
      type: String,
      default: null,
    },
    nda: {
      type: String,
      default: null,
    },
    team_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      default: null,
    },
    permission: {
      type: [String],
      enum: ["canReview"],
      default: [],
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    customFields: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
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
    minimize: false,
  }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);

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

    // Find a system admin user
    const adminUser = await User.findOne({ role: "system admin" });
    
    if (!adminUser) {
      console.error("No system admin user found. Please create one before running this script.");
      process.exit(1);
    }
    
    console.log(`Found system admin with ID: ${adminUser._id}`);

    // Create default teams
    const defaultTeams = [
      {
        name: "Freelancers",
        description: "Independent contractors working on various projects",
        createdBy: adminUser._id,
        members: [],
      },
      {
        name: "Blomega Lab",
        description: "Research and development team focused on innovation",
        createdBy: adminUser._id,
        members: [],
      },
      {
        name: "Acolad",
        description: "Translation and localization specialists",
        createdBy: adminUser._id,
        members: [],
      },
      {
        name: "AWS",
        description: "Amazon Web Services development team",
        createdBy: adminUser._id,
        members: [],
      },
      {
        name: "Cloudera",
        description: "Data platform specialists",
        createdBy: adminUser._id,
        members: [],
      },
      {
        name: "G42",
        description: "AI and cloud computing team",
        createdBy: adminUser._id,
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