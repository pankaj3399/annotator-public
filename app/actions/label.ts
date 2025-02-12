"use server"
import { connectToDatabase } from '@/lib/db';
import Label from '@/models/Label';
import { Project } from '@/models/Project';
import { getTemplateLabel } from './template';

// Action to fetch all labels from the database
export async function getLabels() {
  try {
    await connectToDatabase();
    const labels = await Label.find({});  // Fetch all labels
    return JSON.parse(JSON.stringify(labels));
  } catch (error) {
    console.log(error)
    throw new Error('Error fetching labels');
  }
}


export async function getProjectLabels(projectId: string): Promise<string[]> {
  try {
    await connectToDatabase();
    const project = await Project.findById(projectId).select('templates');

    if (!project || !project.templates) {
      return []; // Return an empty array directly
    }

    // Fetch all template labels concurrently
    const labelArrays = await Promise.all(
      project.templates.map((template:any) => getTemplateLabel(template))
    );

    // Flatten the array, filter out empty values, and store in a Set to ensure uniqueness
    const labelSet = new Set(
      labelArrays.flat().filter((label) => label && label.trim() !== '')
    );


    return Array.from(labelSet); // Return array instead of stringified JSON
  } catch (e) {
    console.error(e);
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
