'use server'
import { authOptions } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { AIJob, AImodel } from "@/models/aiModel";
import { model } from "mongoose";
import { getServerSession } from "next-auth";
import {GoogleGenerativeAI} from '@google/generative-ai'
import OpenAI from 'openai' 
import { Anthropic } from "@anthropic-ai/sdk";

interface FileAttachment {
  fileName: string;
  fileType: string;
  content: string | ArrayBuffer | null;
}
interface FileAttachment {
  fileName: string;
  fileType: string;
  content: string | ArrayBuffer | null;
  fileUrl?: string;
  s3Path?: string;
}

export async function addModel(provider: string, projectId: string, model: string, apiKey: string,name:string, systemPrompt?: string) {
  await connectToDatabase();
  if (!model || !apiKey || !provider) {
    return { error: 'Please fill in all fields' }
  }
  const session = await getServerSession(authOptions)
  try {
    const newModel = await AImodel.create({ user: session?.user.id,name, projectid: projectId, provider, model, apiKey, systemPrompt });
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

async function fetchGuidelineFileContent(projectId: string, s3Path: string): Promise<string | null> {
  try {
    // We need to use absolute URL here to avoid server-side relative URL issues
    const apiUrl = `${process.env.NEXTAUTH_URL || ''}api/projects/${projectId}/guidelines/files/s3`;
    const response = await fetch(`${apiUrl}?s3Path=${encodeURIComponent(s3Path)}&operation=content`);
    
    if (!response.ok) {
      console.error(`Error fetching file: Status ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.success) {
      if (data.isTextContent) {
        return data.content;
      } else {
        return `[${data.contentType} file - content not directly accessible]`;
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error fetching guideline file content:", error);
    return null;
  }
}


export async function generateAiResponse(provider: string,model:string, prompt: string, projectId: string,apiKey:string) {
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
export async function generateAIResponseWithAttachments(
  provider: string, 
  model: string, 
  prompt: string, 
  projectId: string, 
  apiKey: string,
  attachments?: FileAttachment[]
) {
  try {
    // Enhance prompt with file contents
    let enhancedPrompt = prompt;
    
    if (attachments && attachments.length > 0) {
      enhancedPrompt += "\n\n--- Attached Files ---\n";
      
      // Process each attachment
      for (let i = 0; i < attachments.length; i++) {
        const file = attachments[i];
        enhancedPrompt += `File ${i + 1}: ${file.fileName} (${file.fileType})\n`;
        
        // Handle file content
        if (typeof file.content === 'string') {
          // Check if this is just a URL reference (from chat history) and we need to fetch content
          if ((file.content.startsWith('http') || file.content === file.fileUrl) && file.s3Path) {
            console.log(`Fetching content for file ${file.fileName} from s3Path: ${file.s3Path}`);
            const fetchedContent = await fetchGuidelineFileContent(projectId, file.s3Path);
            
            if (fetchedContent) {
              // Limit size to avoid overwhelming the AI
              const contentPreview = fetchedContent.length > 3000 
                ? fetchedContent.substring(0, 3000) + '...' 
                : fetchedContent;
              
              enhancedPrompt += `Content: ${contentPreview}\n\n`;
            } else {
              enhancedPrompt += `Content: [Unable to retrieve file content. Please refer to the file by name.]\n\n`;
            }
          }
          // Check if this is a base64 image
          else if (file.content.startsWith('data:image/')) {
            enhancedPrompt += `Content: [Image data provided]\n\n`;
          }
          // Check if this is a JSON string (like from our binary_file references)
          else if (file.content.startsWith('{') && file.content.includes('binary_file')) {
            try {
              const fileData = JSON.parse(file.content);
              
              // If it has s3Path, try to fetch content
              if (fileData.s3Path) {
                const fetchedContent = await fetchGuidelineFileContent(projectId, fileData.s3Path);
                
                if (fetchedContent) {
                  const contentPreview = fetchedContent.length > 3000 
                    ? fetchedContent.substring(0, 3000) + '...' 
                    : fetchedContent;
                  
                  enhancedPrompt += `Content: ${contentPreview}\n\n`;
                } else {
                  enhancedPrompt += `Content: [Binary file referenced - content not directly accessible]\n\n`;
                }
              } else {
                enhancedPrompt += `Content: [Binary file referenced]\n\n`;
              }
            } catch (e) {
              // Not valid JSON, treat as regular content
              const contentPreview = file.content.length > 3000 
                ? file.content.substring(0, 3000) + '...' 
                : file.content;
              
              enhancedPrompt += `Content: ${contentPreview}\n\n`;
            }
          }
          // Regular text content (with length limit)
          else {
            const contentPreview = file.content.length > 3000 
              ? file.content.substring(0, 3000) + '...' 
              : file.content;
            
            enhancedPrompt += `Content: ${contentPreview}\n\n`;
          }
        } 
        // Handle non-string content
        else if (file.s3Path) {
          // Try to fetch content if we have an s3Path
          const fetchedContent = await fetchGuidelineFileContent(projectId, file.s3Path);
          
          if (fetchedContent) {
            const contentPreview = fetchedContent.length > 3000 
              ? fetchedContent.substring(0, 3000) + '...' 
              : fetchedContent;
            
            enhancedPrompt += `Content: ${contentPreview}\n\n`;
          } else {
            enhancedPrompt += `Content: [File content not available in text format]\n\n`;
          }
        }
        else {
          enhancedPrompt += `Content: [File content not available]\n\n`;
        }
      }
    }

    // AI provider handling with improved system prompts
    switch (provider) {
      case "OpenAI": {
        const openai = new OpenAI({
          apiKey: apiKey
        });

        const completion = await openai.chat.completions.create({
          model: model,
          messages: [
            { 
              role: "system", 
              content: "You are a helpful project assistant. When referencing files, provide insights based on their content when available."
            },
            { role: "user", content: enhancedPrompt }
          ],
          max_tokens: 4096
        });

        return completion.choices[0].message.content;
      }

      case "Anthropic": {
        const anthropic = new Anthropic({
          apiKey: apiKey
        });
        
        const message = await anthropic.messages.create({
          model: model,
          system: "You are a helpful project assistant. When referencing files, provide insights based on their content when available.",
          messages: [{ role: "user", content: enhancedPrompt }],
          max_tokens: 4096,
        });
        
        //@ts-ignore
        return message.content[0].text;
      }

      case "Gemini": {
        const genAI = new GoogleGenerativeAI(apiKey);
        
        // For Gemini, include system prompt in the user content
        const geminiPrompt = `You are a helpful project assistant. When referencing files, provide insights based on their content when available.\n\n${enhancedPrompt}`;
        
        const modelInstance = genAI.getGenerativeModel({ model });
        const result = await modelInstance.generateContent(geminiPrompt);
        
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



