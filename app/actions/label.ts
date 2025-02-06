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


export async function getProjectLabels(projectId: string) {
  try {
    await connectToDatabase();
    const project = await Project.findById(projectId).select('templates');

    if (!project || !project.templates) {
      return JSON.stringify([]); // Return an empty array in string format
    }

    const labelSet = new Set<string>();

    for (const template of project.templates) {
      const labels = await getTemplateLabel(template); // Assuming this returns an array of strings

      if (Array.isArray(labels)) {
        labels.forEach((label) => {
          if (label && label.trim() !== '') {
            labelSet.add(label);
          }
        });
      }
    }

    return JSON.stringify(Array.from(labelSet)); // Stringified array of unique labels
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
