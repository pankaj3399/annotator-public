import mongoose from 'mongoose';
import {Project} from '@/models/Project';
import Task from "@/models/Task";
import { Template } from '@/models/Template';
import { TaskRepeat } from '@/models/TaskRepeat';
// Import all other models here

const { MONGODB_URI } = process.env;

export const connectToDatabase = async () => {
  try {
    // Initialize all models to ensure they are registered
    if (!Project || !Task || !Template || !TaskRepeat) {
      throw new Error("Models not initialized properly.");
    }

    const { connection } = await mongoose.connect(MONGODB_URI as string);
    if (connection.readyState === 1) {
      console.log('Database connection established.');
      return Promise.resolve(true);
    }
  } catch (error) {
    console.error('Error connecting to the database:', error);
    return Promise.reject(error);
  }
};
