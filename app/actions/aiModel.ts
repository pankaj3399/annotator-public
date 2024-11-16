'use server'
import { authOptions } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { AIJob, AImodel } from "@/models/aiModel";
import { model } from "mongoose";
import { getServerSession } from "next-auth";

export async function addModel(provider: string, projectId: string, model: string, apiKey: string, systemPrompt: string,name:string) {
  await connectToDatabase();
  if (!model || !apiKey || !systemPrompt || !provider) {
    return { error: 'Please fill in all fields' }
  }
  const session = await getServerSession(authOptions)
  try {
    const newModel = await AImodel.create({ user: session?.user.id,name, projectid: projectId, provider, model, apiKey, systemPrompt });
    return { message: 'Model added successfully', model: JSON.stringify(newModel) };
  } catch (error) {
    console.error('Error adding model:', error);
    return { error: error.message };
  }
}

export async function deleteModel(modelId: string) {
  try {
    await connectToDatabase();
    await AImodel.findByIdAndDelete(modelId);
    return { message: 'Model deleted successfully' };
  } catch (error) {
    console.error('Error deleting model:', error);
    return { error: 'An error occurred while deleting the model' };
  }
}

export async function deleteCompletedJobs(projectid: string) {
  await connectToDatabase();
  const session = await getServerSession(authOptions)
  try {
    await AImodel.find({ user: session?.user.id,projectid, completed: true });
    return { message: 'Jobs deleted successfully' };
  } catch (error) {
    console.error('Error getting models:', error);
    return { error: 'An error occurred while deleting' };
  }
}

export async function updateModel(model: { id: string;model: string, provider: string; apiKey: string; systemPrompt: string }) {
  await connectToDatabase();
  try {
    const updatedModel = await AImodel.findByIdAndUpdate(model.id, { provider: model.provider,  model: model.model, apiKey: model.apiKey, systemPrompt: model.systemPrompt }, { new: true });
    return { message: 'Model updated successfully', model: JSON.stringify(updatedModel) };
  } catch (error) {
    console.error('Error updating model:', error);
    return { error: 'An error occurred while updating the model' };
  }
}

export async function toggleModel(modelId: string, enabled: boolean) {
  await connectToDatabase();
  try {
    await AImodel.findByIdAndUpdate(modelId, { enabled });
    return { message: 'Model toggled successfully' };
  } catch (error) {
    console.error('Error getting model:', error);
    return { error: 'An error occurred while toggling the model' };
  }
}

export async function addJob(modelid: string, taskid: string, projectid: string) {
  await connectToDatabase();
  try {
    const session = await getServerSession(authOptions)
    const newJob = await AIJob.create({ user: session?.user.id, projectid, taskid, modelid });
    return { message: 'Job added successfully', model: JSON.stringify(newJob) };
  } catch (error) {
    console.error('Error adding job:', error);
    return { error: 'An error occurred while adding the job' };
  }
}

export async function deleteJobByTaskid(Taskid: string) {
  await connectToDatabase();
  try {
    await AIJob.deleteMany({taskid:Taskid});
    return { message: 'Job deleted successfully' };
  } catch (error) {
    console.error('Error deleting job:', error);
    return { error: 'An error occurred while deleting the job' };
  }
}