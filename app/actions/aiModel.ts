'use server'
import { authOptions } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { AIJob, AImodel } from "@/models/aiModel";
import { model } from "mongoose";
import { getServerSession } from "next-auth";
import {GoogleGenerativeAI} from '@google/generative-ai'
import OpenAI from 'openai' 
import { Anthropic } from "@anthropic-ai/sdk";
type Provider = "OpenAI" | "Anthropic" | "Gemini"

const providerModels: Record<Provider, string[]> = {
  OpenAI: ["gpt-4", "gpt-4-turbo", "gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"],
  Anthropic: ["claude-3-5-sonnet-latest", "claude-3-5-sonnet-20240620", "claude-3-haiku-20240307", "claude-3-opus-latest", "claude-3-opus-20240229"],
  Gemini: ["gemini-1.0-pro", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"],
};

export async function addModel(provider: string, projectId: string, model: string, apiKey: string,name:string, systemPrompt?: string) {
  await connectToDatabase();
  if (!model || !apiKey || !provider) {
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




export async function getAIModels(projectid: string) {
  await connectToDatabase();
  try {
    const models = await AImodel.find({ projectid });

    // Stringify the models and return
    return JSON.stringify({ models });
  } catch (error) {
    console.error('Error fetching AI models:', error);
    return JSON.stringify({ error: 'An error occurred while fetching the AI models' });
  }
}





const getProviderFromModel = (model: string): Provider | null => {
  for (const [provider, models] of Object.entries(providerModels)) {
    if (models.includes(model)) {
      return provider as Provider;
    }
  }
  return null;
};

export async function generateAiResponse(provider: string,model:string, prompt: string, projectId: string,apiKey:string) {
  console.log(model)
  console.log(provider)
  console.log(prompt)
  console.log(projectId)
  console.log(apiKey)
  try {
    switch (provider) {
      case "OpenAI": {
        const openai = new OpenAI({
          apiKey: apiKey
        });

        const completion = await openai.chat.completions.create({
          model: model,
          messages: [{ role: "user", content: prompt }],
        });

        return completion.choices[0].message.content;
      }

      case "Anthropic": {
        const anthropic = new Anthropic({
          apiKey:apiKey
        })
        const message = await anthropic.messages.create({
          model: model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 1024,
        });
        //@ts-ignore
        return message.content[0].text
      }

      case "Gemini": {
        const genAI = new GoogleGenerativeAI(
          apiKey
        );
        
        const modelInstance = genAI.getGenerativeModel({ model });
        const result = await modelInstance.generateContent(prompt);
        
        return result.response.text();
      }

      default:
        throw new Error(`Provider ${provider} not implemented`);
    }
  } catch (error) {
    console.error("AI Response Generation Error:", error);
    throw error instanceof Error 
      ? error 
      : new Error("Failed to generate AI response");
  }
}


