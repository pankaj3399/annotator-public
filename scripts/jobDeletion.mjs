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
  const JobApplicationSchema = new mongoose.Schema({
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobPost",
      required: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  });
  
  // Add a compound index to prevent multiple applications
  JobApplicationSchema.index({ jobId: 1, userId: 1 }, { unique: true });

  
  const JobApplication = mongoose.models.JobApplication ||
  mongoose.model("JobApplication", JobApplicationSchema);
  
  const JobPost=
   mongoose.models.JobPost ||
    mongoose.model("JobPost", JobPostSchema);
  

if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not defined in the environment variables');
    process.exit(1);
  }
  




  async function deleteJobsAndApplications(){
    try{
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");

        const deleteJobResponse = await JobPost.deleteMany({});
        console.log(`Migration complete! Jobs deleted:${deleteJobResponse.deletedCount}`)


        const deleteApplicationResponse = await JobApplication.deleteMany({});
        console.log(`Migration complete! Applications deleted:${deleteApplicationResponse.deletedCount} `)




    }
    catch(e){
        console.error("Migration failed:",e);
    }
    finally{
        await mongoose.disconnect();
        console.log("Disconnected from MongoDB");
    }
  }



  deleteJobsAndApplications();