import { connectToDatabase } from '@/lib/db';
import { Project } from '@/models/Project';
import { User } from '@/models/User';
import { Training } from '@/models/Training';

export async function checkProjectAccess(projectId: string, userId: string): Promise<boolean> {
  try {
    await connectToDatabase();
    
    const user = await User.findById(userId);
    if (!user) return false;

    const project = await Project.findById(projectId);
    if (!project) return false;

    // Project manager has access to their own projects
    if (user.role === 'project manager' && project.project_Manager.toString() === userId) {
      return true;
    }

    // Annotators have access if they're assigned to the project
    if (user.role === 'annotator') {
      return await checkAnnotatorProjectAccess(projectId, userId);
    }

    // System admin has access to all projects
    if (user.role === 'system admin') {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking project access:', error);
    return false;
  }
}

async function checkAnnotatorProjectAccess(projectId: string, userId: string): Promise<boolean> {
  try {
    // Check if annotator is invited to any training in this project
    const training = await Training.findOne({
      project: projectId,
      invitedAnnotators: userId
    });

    return !!training;
  } catch (error) {
    console.error('Error checking annotator project access:', error);
    return false;
  }
}

export async function getUserProjectRole(projectId: string, userId: string): Promise<string | null> {
  try {
    await connectToDatabase();
    
    const user = await User.findById(userId);
    if (!user) return null;

    const project = await Project.findById(projectId);
    if (!project) return null;

    // Check if user is the project manager
    if (project.project_Manager.toString() === userId) {
      return 'project_manager';
    }

    // Check if user is an annotator assigned to this project
    const hasAnnotatorAccess = await checkAnnotatorProjectAccess(projectId, userId);
    if (hasAnnotatorAccess && user.role === 'annotator') {
      return 'annotator';
    }

    // System admin
    if (user.role === 'system admin') {
      return 'system_admin';
    }

    return null;
  } catch (error) {
    console.error('Error getting user project role:', error);
    return null;
  }
}

export function canConfigureAI(userProjectRole: string | null): boolean {
  return userProjectRole === 'project_manager' || userProjectRole === 'system_admin';
}

export function getChatGroup(userProjectRole: string | null): string {
  if (userProjectRole === 'project_manager' || userProjectRole === 'system_admin') {
    return 'project_manager';
  }
  return 'annotators';
}