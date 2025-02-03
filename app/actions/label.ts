"use server"
import { connectToDatabase } from '@/lib/db';
import Label from '@/models/Label';

// Action to fetch all labels from the database
export async function getLabels() {
  try {
    await connectToDatabase();
    const labels = await Label.find({});  // Fetch all labels
    return JSON.stringify(labels);
  } catch (error) {
    console.log(error)
    throw new Error('Error fetching labels');
  }
}

// Action to create a new label
export async function createCustomLabel(name: string) {
  try {
    await connectToDatabase();
    // Check if label with the same name already exists
    const existingLabel = await Label.findOne({ name });
    if (existingLabel) {
      throw new Error('Label with this name already exists');
    }

    const newLabel = new Label({ name });
    await newLabel.save();

    return JSON.stringify(newLabel);
  } catch (error) {
    throw new Error('Error creating label: ' + error);
  }
}
