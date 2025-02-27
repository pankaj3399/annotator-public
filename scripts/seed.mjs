import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { config } from "dotenv";
import saltAndHashPassword from "../utils/password.js";

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

//Used the same schema as the User model in the models folder
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
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    minimize: false,
  }
);

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

const User = mongoose.models.User || mongoose.model("User", userSchema);
const Team = mongoose.models.Team || mongoose.model("Team", teamSchema);

async function seed() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");

    const password = saltAndHashPassword(process.env.ADMIN_PASSWORD);

    const users = [
      {
        name: "System Admin",
        email: process.env.ADMIN_EMAIL,
        password: password,
        domain: ["management", "development"],
        location: "New York, USA",
        phone: "+1-234-567-8900",
        lang: ["english", "spanish"],
        role: "system admin",
        linkedin: "https://linkedin.com/in/admin",
        resume: "",
        nda: "",
        permission: [],
        customFields: new Map(),    
        lastLogin: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    console.log("Creating user...");
    const createdUsers = await User.insertMany(users);
    console.log(`Created ${createdUsers.length} users successfully`);

    createdUsers.forEach((user) => {
      console.log(`Created user: ${user.email} with role: ${user.role}`);
    });

    // Get the admin user for creating teams
    const admin = createdUsers[0];

    // Create default teams
    const defaultTeams = [
      {
        name: "Freelancers",
        description: "Independent contractors working on various projects",
        createdBy: admin._id,
        members: [admin._id],
      },
      {
        name: "Blomega Lab",
        description: "Research and development team focused on innovation",
        createdBy: admin._id,
        members: [admin._id],
      },
      {
        name: "Acolad",
        description: "Translation and localization specialists",
        createdBy: admin._id,
        members: [admin._id],
      },
      {
        name: "AWS",
        description: "Amazon Web Services development team",
        createdBy: admin._id,
        members: [admin._id],
      },
      {
        name: "Cloudera",
        description: "Data platform specialists",
        createdBy: admin._id,
        members: [admin._id],
      },
      {
        name: "G42",
        description: "AI and cloud computing team",
        createdBy: admin._id,
        members: [admin._id],
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

    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
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

seed();