// app/actions/providerAIModel.ts
'use server'

import { getServerSession } from "next-auth/next";
import { connectToDatabase } from "@/lib/db";
import { authOptions } from "@/auth";
import mongoose from "mongoose";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
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
// Define model schema for TypeScript
interface IProviderAIModel {
    _id: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    name: string;
    model: string;
    provider: string;
    apiKey: string;
    systemPrompt?: string;
    lastUsed?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

// Define the schema for Mongoose
const ProviderAIModelSchema = new mongoose.Schema<IProviderAIModel>({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    model: {
        type: String,
        required: true
    },
    provider: {
        type: String,
        required: true
    },
    apiKey: {
        type: String,
        required: true
    },
    systemPrompt: {
        type: String,
        default: ''
    },
    lastUsed: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update timestamp on save
ProviderAIModelSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

// Create compound index for unique model names per user
ProviderAIModelSchema.index({ user: 1, name: 1 }, { unique: true });

// Create model
const ProviderAIModel = mongoose.models.ProviderAIModel ||
    mongoose.model<IProviderAIModel>('ProviderAIModel', ProviderAIModelSchema);

// Response type for AI model operations
interface AIModelResponse {
    success: boolean;
    message?: string;
    error?: string;
    modelId?: string;
    models?: FormattedAIModel[];
}

// Interface for formatted AI model data sent to client
export interface FormattedAIModel {
    id: string;
    name: string;
    provider: string;
    model: string;
    apiKey: string;
    systemPrompt?: string;
    lastUsed?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

// Interface for update model data
interface UpdateModelData {
    id: string;
    name: string;
    provider: string;
    model: string;
    apiKey?: string;
    systemPrompt?: string;
}

/**
* Get all AI models for the current user
* @returns Promise with AI models or error message
*/
export async function getProviderAIModels(): Promise<AIModelResponse> {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return { success: false, error: "Unauthorized" };
        }

        await connectToDatabase();

        const models = await ProviderAIModel.find({
            user: (session.user as any).id
        }).sort({ updatedAt: -1 });

        // Format the models for client consumption
        const formattedModels = models.map(model => ({
            id: model._id.toString(),
            name: model.name,
            provider: model.provider,
            model: model.model,
            apiKey: model.apiKey,
            systemPrompt: model.systemPrompt,
            lastUsed: model.lastUsed,
            createdAt: model.createdAt,
            updatedAt: model.updatedAt
        }));

        return {
            success: true,
            models: formattedModels
        };
    } catch (error) {
        console.error("Error fetching AI models:", error);
        return {
            success: false,
            error: "Failed to fetch AI models"
        };
    }
}

/**
* Update an existing AI model
* @param modelData Data for the model to update
* @returns Promise with success status or error message
*/
export async function updateProviderAIModel(modelData: UpdateModelData): Promise<AIModelResponse> {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return { success: false, error: "Unauthorized" };
        }

        if (!modelData.id) {
            return { success: false, error: "Model ID is required" };
        }

        await connectToDatabase();

        // Find the existing model to verify ownership
        const existingModel = await ProviderAIModel.findOne({
            _id: modelData.id,
            user: (session.user as any).id
        });

        if (!existingModel) {
            return { success: false, error: "Model not found or access denied" };
        }

        // Update fields
        existingModel.name = modelData.name;
        existingModel.model = modelData.model;
        existingModel.provider = modelData.provider;
        existingModel.systemPrompt = modelData.systemPrompt || '';

        // Only update API key if provided
        if (modelData.apiKey && modelData.apiKey.trim() !== '') {
            existingModel.apiKey = modelData.apiKey;
        }

        // Save updated model
        await existingModel.save();

        return {
            success: true,
            message: "AI model updated successfully"
        };
    } catch (error: unknown) {
        console.error("Error updating AI model:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to update AI model"
        };
    }
}

/**
* Add a new AI model
* @param provider Provider identifier
* @param model Model identifier
* @param apiKey Provider API key
* @param name Display name for this model
* @param systemPrompt Optional system prompt
* @returns Promise with success status, message, and model ID or error
*/
export async function addProviderAIModel(
    provider: string,
    model: string,
    apiKey: string,
    name: string,
    systemPrompt: string = ''
): Promise<AIModelResponse> {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return { success: false, error: "Unauthorized" };
        }

        if (!provider || !model || !apiKey || !name) {
            return { success: false, error: "Missing required fields" };
        }

        await connectToDatabase();

        // Check if a model with the same name already exists for this user
        const existingModel = await ProviderAIModel.findOne({
            user: (session.user as any).id,
            name: name
        });

        if (existingModel) {
            return { success: false, error: "A model with this name already exists" };
        }

        // Create new model
        const newModel = new ProviderAIModel({
            user: (session.user as any).id,
            name,
            model,
            provider,
            apiKey: apiKey,
            systemPrompt: systemPrompt || '',
            lastUsed: null
        });

        // Save the new model
        await newModel.save();

        return {
            success: true,
            message: "AI model added successfully",
            modelId: newModel._id.toString()
        };
    } catch (error: unknown) {
        console.error("Error adding AI model:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to add AI model"
        };
    }
}

/**
* Delete an AI model
* @param modelId The ID of the model to delete
* @returns Promise with success status or error message
*/
export async function deleteProviderAIModel(modelId: string): Promise<AIModelResponse> {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return { success: false, error: "Unauthorized" };
        }

        await connectToDatabase();

        // Find the model to verify ownership before deletion
        const model = await ProviderAIModel.findOne({
            _id: modelId,
            user: (session.user as any).id
        });

        if (!model) {
            return { success: false, error: "Model not found or access denied" };
        }

        // Perform complete deletion
        await ProviderAIModel.deleteOne({ _id: modelId });

        return {
            success: true,
            message: "AI model deleted successfully"
        };
    } catch (error: unknown) {
        console.error("Error deleting AI model:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to delete AI model"
        };
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
        switch (provider.toLowerCase()) {
            case "openai": {
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

            case "anthropic": {
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

            case "gemini": {
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