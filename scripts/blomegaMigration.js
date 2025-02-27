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

// Define schemas for the migration
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  team_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Team",
    default: null,
  },
});

const teamSchema = new mongoose.Schema({
  name: String,
  description: String,
  members: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }
  ],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  isActive: Boolean,
});

async function migrateUsers() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");

    // Create models
    const User = mongoose.model("User", userSchema);
    const Team = mongoose.model("Team", teamSchema);

    // Find the Blomega Lab team
    const blomegaTeam = await Team.findOne({ name: "Blomega Lab" });
    
    if (!blomegaTeam) {
      console.error("Blomega Lab team not found. Please run the seed script first.");
      process.exit(1);
    }

    console.log(`Found Blomega Lab team with ID: ${blomegaTeam._id}`);

    // Get count of users who don't have a team_id yet
    const usersWithoutTeam = await User.countDocuments({ team_id: null });
    console.log(`Found ${usersWithoutTeam} users without a team assigned`);

    // Update all users to have the Blomega Lab team_id
    const updateResult = await User.updateMany(
      { team_id: null },
      { $set: { team_id: blomegaTeam._id } }
    );

    console.log(`Updated ${updateResult.modifiedCount} users to be part of Blomega Lab team`);

    // Add all users to the team's members array if they're not already there
    const allUsers = await User.find({});
    
    // Extract user IDs
    const userIds = allUsers.map(user => user._id);
    
    // Update the team to include all users as members
    const teamUpdateResult = await Team.updateOne(
      { _id: blomegaTeam._id },
      { $addToSet: { members: { $each: userIds } } }
    );

    console.log(`Added ${allUsers.length} users to Blomega Lab's members list`);
    console.log(`Team update result: ${teamUpdateResult.modifiedCount > 0 ? 'successful' : 'no changes needed'}`);

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Error during migration:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Database connection closed");
    process.exit(0);
  }
}

migrateUsers();