import mongoose from "mongoose";
import dotenv from 'dotenv'

dotenv.config();

const JobPostSchema = new mongoose.Schema({
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    projectDuration: {
      startDate: {
        type: Date,
        required: true,
      },
      endDate: {
        type: Date,
        required: true,
      },
    },
    location:{
      type:String,
      required:true
    },
    lat:{
      type:String,
      required:false
    },
    lng:{
      type:String,
      required:false
    },
    compensation: {
      type: String,
      required: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
    image:{
      type:String,
      required:false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    label:{
      type:[String],
      required:false
    }
  });
  
  const JobPost=
   mongoose.models.JobPost ||
    mongoose.model("JobPost", JobPostSchema);
  

if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not defined in the environment variables');
    process.exit(1);
  }
  
async function migrateJobPosts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const sanFranciscoCoords = {
      location: "San Francisco",
      lat: "37.7749",
      lng: "-122.4194",
    };

    const result = await JobPost.updateMany(
      { location: { $exists: false } }, // Only update jobs missing the location field
      { $set: sanFranciscoCoords }
    );

    console.log(`Migration complete. Modified ${result.modifiedCount} documents.`);
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

migrateJobPosts();
