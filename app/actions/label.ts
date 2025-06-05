"use server"
import { connectToDatabase } from '@/lib/db';
import { Project } from '@/models/Project';
import Label from '@/models/Label';

export async function getLabelsForAdmin() {
  try {
    await connectToDatabase();
    
    // Get labels from projects
    const projects = await Project.find({}).select('labels');
    const projectLabels = new Set(projects.flatMap(project => project.labels || []));
    
    // Get labels from Label schema
    const labelDocs = await Label.find({}).select('name');
    const schemaLabels = new Set(labelDocs.map(label => label.name));
    
    // Combine both sets of labels
    const allLabels = new Set([...projectLabels, ...schemaLabels]);
    
    // Convert strings to objects with _id and name
    return Array.from(allLabels).map((label, index) => ({
      _id: `label_${index}`,
      name: label
    }));
  } catch (error) {
    console.log(error)
    throw new Error('Error fetching labels');
  }
}

export async function getLabels() {
  try {
    await connectToDatabase();
    const projects = await Project.find({}).select('labels');
    
    const allLabels = new Set(projects.flatMap(project => project.labels || []));
    
    // Convert strings to objects with _id and name
    return Array.from(allLabels).map((label, index) => ({
      _id: `label_${index}`, // or generate proper IDs
      name: label
    }));
  } catch (error) {
    console.log(error)
    throw new Error('Error fetching labels');
  }
}


// Action to fetch labels for a specific project
export async function getProjectLabels(projectId: string): Promise<string[]> {
  try {
    await connectToDatabase();
    const project = await Project.findById(projectId).select('labels');

    if (!project) {
      return []; // Return empty array if project not found
    }

    return project.labels || []; // Return project labels or empty array if labels is undefined
  } catch (e) {
    console.error(e);
    throw new Error('Error fetching project labels');
  }
}

// Action to create a new label (works with or without project ID)
export async function createCustomLabel(name: string, projectId?: string) {
  try {
    await connectToDatabase();
    
    // Always create the label in the Label schema first (if it doesn't exist)
    const existingLabel = await Label.findOne({ name });
    if (!existingLabel) {
      await Label.create({ name });
    }
    
    // If projectId is provided, also add to project
    if (projectId) {
      const project = await Project.findById(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      // Add the label to the project's labels array if not already there
      const updatedProject = await Project.findByIdAndUpdate(
        projectId,
        { $addToSet: { labels: name } },
        { new: true }
      );

      return JSON.stringify(updatedProject.labels);
    }

    return { success: true, message: 'Label created successfully' };
  } catch (error) {
    throw new Error('Error creating label: ' + error);
  }
}

// Optional: Add a function to add multiple labels to a project
export async function addLabelsToProject(projectId: string, labels: string[]) {
  try {
    await connectToDatabase();
    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      { $addToSet: { labels: { $each: labels } } },
      { new: true }
    );

    if (!updatedProject) {
      throw new Error('Project not found');
    }

    return updatedProject.labels;
  } catch (error) {
    throw new Error('Error adding labels to project: ' + error);
  }
}

// Optional: Add a function to remove a label from a project
export async function removeProjectLabel(projectId: string, label: string) {
  try {
    await connectToDatabase();
    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      { $pull: { labels: label } },
      { new: true }
    );

    if (!updatedProject) {
      throw new Error('Project not found');
    }

    return updatedProject.labels;
  } catch (error) {
    throw new Error('Error removing label from project: ' + error);
  }
}

export async function fetchAllLabelsFromLabelsModel() {
  try {
    await connectToDatabase();
    const labels = await Label.find({}).select('name').sort({ name: 1 });
    return labels.map(label => label.name);
  } catch (error) {
    console.error('Error fetching labels from Labels model:', error);
    throw new Error('Error fetching labels from Labels model');
  }
}