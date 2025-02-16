"use server"
import { connectToDatabase } from '@/lib/db';
import { Project } from '@/models/Project';

// Action to fetch all labels across all projects
export async function getLabels() {
  try {
    await connectToDatabase();
    // Fetch all projects and select only the labels field
    const projects = await Project.find({}).select('labels');

    // Combine all labels from all projects and remove duplicates
    const allLabels = new Set(projects.flatMap(project => project.labels || []));
    return Array.from(allLabels);
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

// Action to create a new label for a specific project
export async function createCustomLabel(name: string, projectId: string) {
  try {
    await connectToDatabase();
    const project = await Project.findById(projectId);

    if (!project) {
      throw new Error('Project not found');
    }

    // Check if label already exists in this project
    if (!project.labels) {
      project.labels = [];
    }
    if (project.labels.includes(name)) {
      throw new Error('Label already exists in this project');
    }

    // Add the new label to the project's labels array
    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      { $addToSet: { labels: name } },
      { new: true }
    );

    return JSON.stringify(updatedProject.labels);
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