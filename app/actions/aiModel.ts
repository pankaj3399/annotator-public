//app/actions/aiModel.ts
'use server'
import { authOptions } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { AIJob, AImodel } from "@/models/aiModel";
import { getServerSession } from "next-auth";
import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'
import { Anthropic } from "@anthropic-ai/sdk";
import { getProviderAIModels } from "./providerAIModel";

export async function addModel(provider: string, projectId: string, model: string, apiKey: string, name: string, systemPrompt?: string) {
  await connectToDatabase();
  if (!model || !apiKey || !provider) {
    return { error: 'Please fill in all fields' }
  }
  const session = await getServerSession(authOptions)
  try {
    const newModel = await AImodel.create({ user: session?.user.id, name, projectid: projectId, provider, model, apiKey, systemPrompt });
    return { message: 'Model added successfully', model: JSON.stringify(newModel) };
  } catch (error: any) {
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
    await AImodel.find({ user: session?.user.id, projectid, completed: true });
    return { message: 'Jobs deleted successfully' };
  } catch (error) {
    console.error('Error getting models:', error);
    return { error: 'An error occurred while deleting' };
  }
}

export async function updateModel(model: { id: string; model: string, provider: string; apiKey: string; systemPrompt: string }) {
  await connectToDatabase();
  try {
    const updatedModel = await AImodel.findByIdAndUpdate(model.id, { provider: model.provider, model: model.model, apiKey: model.apiKey, systemPrompt: model.systemPrompt }, { new: true });
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
    await AIJob.deleteMany({ taskid: Taskid });
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


export async function generateAiResponse(provider: string, model: string, prompt: string, projectId: string, apiKey: string) {
  try {
    // Validate inputs
    if (!provider || !model || !prompt || !apiKey) {
      throw new Error("Missing required parameters: provider, model, prompt, or API key");
    }

    switch (provider.toLowerCase()) {
      case "openai": {
        if (!apiKey.startsWith('sk-')) {
          throw new Error("Invalid OpenAI API key format. API key should start with 'sk-'");
        }

        const openai = new OpenAI({
          apiKey: apiKey
        });

        try {
          const completion = await openai.chat.completions.create({
            model: model,
            messages: [{ role: "user", content: prompt }],
            max_tokens: 2000,
            temperature: 0.7,
          });

          const content = completion.choices[0]?.message?.content;
          if (!content) {
            throw new Error("OpenAI returned an empty response. This might be due to content filtering or model limitations.");
          }

          return content;
        } catch (openaiError: any) {
          console.error("OpenAI API Error:", openaiError);
          
          // Parse OpenAI specific errors
          if (openaiError.status === 401) {
            throw new Error("Invalid OpenAI API key. Please check your API key in settings.");
          } else if (openaiError.status === 429) {
            throw new Error("OpenAI rate limit exceeded. Please wait a moment and try again.");
          } else if (openaiError.status === 400) {
            throw new Error(`OpenAI request error: ${openaiError.message || 'Invalid request parameters'}`);
          } else if (openaiError.status === 404) {
            throw new Error(`OpenAI model '${model}' not found. Please check if the model name is correct.`);
          } else {
            throw new Error(`OpenAI API error: ${openaiError.message || 'Unknown error occurred'}`);
          }
        }
      }

      case "anthropic": {
        if (!apiKey.startsWith('sk-ant-')) {
          throw new Error("Invalid Anthropic API key format. API key should start with 'sk-ant-'");
        }

        const anthropic = new Anthropic({
          apiKey: apiKey
        });

        try {
          const message = await anthropic.messages.create({
            model: model,
            messages: [{ role: "user", content: prompt }],
            max_tokens: 2000,
          });

          // @ts-ignore - Anthropic typing issue
          const content = message.content[0]?.text;
          if (!content) {
            throw new Error("Anthropic returned an empty response. This might be due to content filtering or model limitations.");
          }

          return content;
        } catch (anthropicError: any) {
          console.error("Anthropic API Error:", anthropicError);
          
          // Parse Anthropic specific errors
          if (anthropicError.status === 401) {
            throw new Error("Invalid Anthropic API key. Please check your API key in settings.");
          } else if (anthropicError.status === 429) {
            throw new Error("Anthropic rate limit exceeded. Please wait a moment and try again.");
          } else if (anthropicError.status === 400) {
            throw new Error(`Anthropic request error: ${anthropicError.message || 'Invalid request parameters'}`);
          } else if (anthropicError.status === 404) {
            throw new Error(`Anthropic model '${model}' not found. Please check if the model name is correct.`);
          } else {
            throw new Error(`Anthropic API error: ${anthropicError.message || 'Unknown error occurred'}`);
          }
        }
      }

      case "gemini": {
        const genAI = new GoogleGenerativeAI(apiKey);

        try {
          const modelInstance = genAI.getGenerativeModel({ model });
          const result = await modelInstance.generateContent(prompt);

          const content = result.response.text();
          if (!content || content.trim() === '') {
            throw new Error("Gemini returned an empty response. This might be due to content filtering or model limitations.");
          }

          return content;
        } catch (geminiError: any) {
          console.error("Gemini API Error:", geminiError);
          
          // Parse Gemini specific errors
          if (geminiError.message?.includes('API_KEY_INVALID')) {
            throw new Error("Invalid Google Gemini API key. Please check your API key in settings.");
          } else if (geminiError.message?.includes('QUOTA_EXCEEDED')) {
            throw new Error("Gemini API quota exceeded. Please check your Google Cloud billing and quotas.");
          } else if (geminiError.message?.includes('MODEL_NOT_FOUND')) {
            throw new Error(`Gemini model '${model}' not found. Please check if the model name is correct.`);
          } else if (geminiError.message?.includes('SAFETY')) {
            throw new Error("Content was blocked by Gemini's safety filters. Please review and modify your job description.");
          } else {
            throw new Error(`Gemini API error: ${geminiError.message || 'Unknown error occurred'}`);
          }
        }
      }

      default:
        throw new Error(`AI Provider '${provider}' is not supported. Available providers: OpenAI, Anthropic, Gemini`);
    }
  } catch (error) {
    console.error("AI Response Generation Error:", error);
    
    // Re-throw with more context if it's not already a detailed error
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error(`Failed to generate AI response: ${String(error)}`);
    }
  }
}

export async function importProviderModelToProject(
  projectId: string,
  providerModelId: string,
  customName?: string,
  customPrompt?: string
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" }
    }
    
    await connectToDatabase()
    
    // Fetch the provider models
    const result = await getProviderAIModels()
    
    if (!result.success) {
      return { success: false, error: "Failed to fetch provider models" }
    }
    
    // Find the specific model
    const providerModel = result.models?.find(model => model.id === providerModelId)
    
    if (!providerModel) {
      return { success: false, error: "Provider model not found" }
    }
    
    // Check if this model is already in the project
    const existingModel = await AImodel.findOne({
      user: session.user.id,
      projectid: projectId,
      model: providerModel.model,
      provider: providerModel.provider
    })
    
    if (existingModel) {
      return { success: false, error: "This model is already added to the project" }
    }
    
    // Create the project model
    const newModel = await AImodel.create({
      user: session.user.id,
      projectid: projectId,
      name: customName || providerModel.name,
      model: providerModel.model,
      provider: providerModel.provider,
      enabled: true,
      apiKey: providerModel.apiKey,
      systemPrompt: customPrompt || providerModel.systemPrompt || ""
    })
    
    return { 
      success: true, 
      message: "Model imported successfully", 
      model: JSON.stringify(newModel)
    }
  } catch (error: any) {
    console.error("Error importing provider model:", error)
    return { success: false, error: error.message }
  }
}