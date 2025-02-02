import mongoose from 'mongoose';

const { MONGODB_URI } = process.env;

let isConnected: boolean = false; // Track connection status

export const connectToDatabase = async () => {
  if (isConnected) {
    console.log('Already connected to the database.');
    return Promise.resolve(true);
  }

  try {
    // Connect to the database
    await mongoose.connect(MONGODB_URI as string);
    isConnected = true; // Update connection status
    console.log('Database connection established.');
    return Promise.resolve(true);
  } catch (error) {
    console.error('Error connecting to the database:', error);
    return Promise.reject(error);
  }
};
