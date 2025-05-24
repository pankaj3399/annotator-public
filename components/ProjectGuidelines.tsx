'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  Bot,
  FileText,
  Image,
  Loader2,
  PaperclipIcon,
  Send,
  X,
  Settings,
  Plus,
  Link as LinkIcon,
  Search,
  Folder,
  ChevronRight,
  Upload,
  Download,
  ExternalLink,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  generateAIResponseWithAttachments,
  getProviderAIModels,
} from '@/app/actions/providerAIModel';
import Loader from './ui/NewLoader/Loader';
import pdfToText from 'react-pdftotext';

// Constants
const MAX_PDF_SIZE = 10 * 1024 * 1024; // 10MB limit
const MAX_PDF_TEXT_LENGTH = 50000; // Limit PDF text to 50k characters

// Error handling utility for AI model access errors
interface AIError {
  status?: number;
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
  message?: string;
}

// Function to parse AI errors and create user-friendly messages
const parseAIError = (error: any): { title: string; message: string; action?: string } => {
  // Convert error to string for pattern matching
  const errorString = JSON.stringify(error).toLowerCase();
  const errorMessage = (error.message || '').toLowerCase();
  
  // Handle authentication/token errors (check multiple patterns)
  if (
    error.status === 401 || 
    error.status === 403 ||
    errorString.includes('unauthorized') ||
    errorString.includes('invalid api key') ||
    errorString.includes('invalid_api_key') ||
    errorString.includes('authentication') ||
    errorString.includes('api key') ||
    errorMessage.includes('unauthorized') ||
    errorMessage.includes('invalid api key') ||
    errorMessage.includes('authentication') ||
    errorMessage.includes('forbidden') ||
    (error.error && (
      error.error.type === 'invalid_request_error' ||
      error.error.code === 'invalid_api_key' ||
      error.error.code === 'authentication_error'
    ))
  ) {
    return {
      title: 'Authentication Failed',
      message: 'Your API key is invalid, expired, or doesn\'t have permission to access this model. Please check your AI provider settings.',
      action: 'Update API Key'
    };
  }

  // Handle OpenAI specific model access errors
  if (error.status === 404 && error.error?.code === 'model_not_found') {
    const modelName = extractModelNameFromError(error.error.message || '');
    return {
      title: 'AI Model Not Available',
      message: `The ${modelName} model is not accessible with your current API key. You may need to upgrade your OpenAI plan or check your model permissions.`,
      action: 'Configure Different Model'
    };
  }

  // Handle rate limiting
  if (
    error.status === 429 ||
    errorString.includes('rate limit') ||
    errorString.includes('rate_limit_exceeded') ||
    errorMessage.includes('rate limit')
  ) {
    return {
      title: 'Rate Limit Exceeded',
      message: 'You\'ve reached your API usage limit. Please try again later or upgrade your plan.',
      action: 'Try Again Later'
    };
  }

  // Handle quota exceeded
  if (
    (error.status === 403 && error.error?.message?.includes('quota')) ||
    errorString.includes('quota exceeded') ||
    errorString.includes('insufficient_quota') ||
    errorMessage.includes('quota')
  ) {
    return {
      title: 'Quota Exceeded',
      message: 'You\'ve used up your monthly quota. Please upgrade your plan or wait for the next billing cycle.',
      action: 'Upgrade Plan'
    };
  }

  // Handle network/connection errors (only if not authentication related)
  if (
    errorMessage.includes('fetch') ||
    errorMessage.includes('network') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('timeout') ||
    error.name === 'TypeError' ||
    error.name === 'NetworkError'
  ) {
    return {
      title: 'Connection Error',
      message: 'Unable to connect to the AI service. Please check your internet connection and try again.',
      action: 'Retry'
    };
  }

  // Handle server errors
  if (error.status >= 500) {
    return {
      title: 'Server Error',
      message: 'The AI service is temporarily unavailable. Please try again in a few moments.',
      action: 'Try Again Later'
    };
  }

  // Generic error fallback
  return {
    title: 'AI Service Error',
    message: error.message || error.error?.message || 'An unexpected error occurred while generating the AI response.',
    action: 'Try Again'
  };
};

// Extract model name from error message
const extractModelNameFromError = (message: string): string => {
  const modelMatch = message.match(/`([^`]+)`/);
  return modelMatch ? modelMatch[1] : 'requested';
};

// Utility function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Utility function to truncate text
const truncateText = (text: string, maxLength: number): { text: string; wasTruncated: boolean } => {
  if (text.length <= maxLength) {
    return { text, wasTruncated: false };
  }
  return { 
    text: text.substring(0, maxLength) + '\n\n[Text truncated due to length...]',
    wasTruncated: true
  };
};

// Interfaces remain the same
interface FileAttachment {
  fileName: string;
  fileType: string;
  content: string | ArrayBuffer | null;
  fileUrl?: string;
  s3Path?: string;
}
interface AIModel {
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
interface Attachment {
  fileName: string;
  fileType: string;
  fileSize?: number;
  fileUrl: string;
  s3Path: string;
}

interface Message {
  _id: string;
  sender: {
    _id: string;
    name: string;
    email: string;
    image?: string;
  };
  content: string;
  timestamp: string;
  attachments: Attachment[];
  isAiMessage?: boolean;
  aiProvider?: string;
  aiModel?: string;
}

interface File extends Attachment {
  uploadedAt: string;
  uploadedBy: {
    _id: string;
    name: string;
    email: string;
    image?: string;
  };
  originalFile?: any;
}

interface AIConfig {
  provider: string;
  model: string;
  apiKey: string;
  modelName?: string;
}

interface GuidelineData {
  aiProvider?: string;
  aiModel?: string;
  description: string;
  messages: Message[];
  files: File[];
}

interface AIModelSelectorProps {
  onSelect: (config: AIConfig) => void;
  isLoading: boolean;
}

interface DataSource {
  name: string;
  status: 'connected' | 'available';
  icon: React.ReactNode;
}

// Interface for the Knowledge Sidebar props
interface KnowledgeSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  files: File[];
  fileInputRef: React.RefObject<HTMLInputElement>;
  showIframe: boolean;
  setShowIframe: (show: boolean) => void;
  handleConnect: () => void;
  handleBackFromIframe: () => void;
  onDownloadFile: (file: File) => void;
}

// Interface for the AI Model Selector Bottom Sheet
interface AIModelBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (config: AIConfig) => void;
  isLoading: boolean;
  currentConfig: AIConfig | null;
  isConfigured: boolean;
}

// New Sidebar Component for Knowledge Files
const KnowledgeSidebar: React.FC<KnowledgeSidebarProps> = ({ 
  isOpen, 
  onClose, 
  files, 
  fileInputRef,
  showIframe,
  setShowIframe,
  handleConnect,
  handleBackFromIframe,
  onDownloadFile
}) => {
  return (
    <div 
      className={`fixed inset-y-0 right-0 w-[400px] max-w-full bg-background shadow-lg transform transition-transform duration-300 ease-in-out z-50 flex flex-col border-l ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Sidebar Header */}
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-xl font-semibold">Knowledge Files</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Sidebar Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="uploaded" className="flex-1 flex flex-col h-full">
          <div className="flex border-b bg-muted/30">
            <TabsList className="bg-transparent h-auto p-0 w-full flex">
              <TabsTrigger 
                value="uploaded" 
                className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground py-3 px-4 data-[state=active]:bg-white/70 dark:data-[state=active]:bg-background/70"
              >
                Uploaded Files
              </TabsTrigger>
              <TabsTrigger 
                value="connected" 
                className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground py-3 px-4 data-[state=active]:bg-white/70 dark:data-[state=active]:bg-background/70"
              >
                Connected Data
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="uploaded" className="p-4 m-0 flex-1 overflow-auto">
            {files.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FileText className="h-10 w-10 text-muted-foreground mb-3 opacity-50" />
                <p className="text-muted-foreground">No files have been uploaded yet</p>
                <Button variant="outline" className="mt-4" onClick={() => {
                  if (fileInputRef.current) fileInputRef.current.click();
                }}>
                  Upload PDF File
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Dynamic file list */}
                {files.length > 0 && files.map((file, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-3 border-0 bg-muted/20 rounded-md"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="text-blue-500 flex-shrink-0">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate" title={file.fileName}>
                          {file.fileName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatFileSize(file.fileSize || 0)} • {
                              new Date(file.uploadedAt).toLocaleDateString('en-US', {
                                month: 'numeric',
                                day: 'numeric',
                                year: 'numeric'
                              }).replace(/\//g, '/')
                            }
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onDownloadFile(file)}
                        title="Download file"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="connected" className="p-4 m-0 flex-1 overflow-auto">
            {!showIframe ? (
              <div>
                <div className="flex justify-end items-center mb-4">
                  <Button variant="outline" className="h-9" onClick={handleConnect}>
                    <LinkIcon className="h-4 w-4 mr-2" /> Connect
                  </Button>
                </div>

              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center mb-2">
                  <Button size="sm" variant="ghost" onClick={handleBackFromIframe} className="flex items-center">
                    <X className="h-4 w-4 mr-1" /> Close Connection Manager
                  </Button>
                </div>
                <div className="border rounded-md overflow-hidden h-[calc(100vh-220px)]">
                  <iframe 
                    src="/projects/data" 
                    className="w-full h-full"
                    title="Project Data Connection Manager"
                  />
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// New AI Model Bottom Sheet Component
const AIModelBottomSheet: React.FC<AIModelBottomSheetProps> = ({
  isOpen,
  onClose,
  onSelect,
  isLoading,
  currentConfig,
  isConfigured
}) => {
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);
  const [aiModels, setAiModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    const fetchModels = async () => {
      setLoading(true);
      try {
        const response = await getProviderAIModels();
        if (response.success && response.models) {
          setAiModels(response.models);
          
          // Pre-select the current model if it exists
          if (currentConfig?.provider && currentConfig?.model) {
            const currentModel = response.models.find(
              model => model.provider === currentConfig.provider && model.model === currentConfig.model
            );
            if (currentModel) {
              setSelectedModel(currentModel);
            }
          }
        } else {
          toast.error(response.error || 'Failed to fetch AI models');
        }
      } catch (error) {
        console.error('Error fetching AI models:', error);
        toast.error('Error loading AI models');
      } finally {
        setLoading(false);
      }
    };
    
    if (isOpen) {
      fetchModels();
    }
  }, [isOpen, currentConfig]);

  const handleSaveSettings = () => {
    if (selectedModel) {
      const config = {
        provider: selectedModel.provider,
        model: selectedModel.model,
        apiKey: selectedModel.apiKey,
        modelName: selectedModel.name,
      };
      onSelect(config);
    }
    onClose();
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const model = aiModels.find(m => m.id === id) || null;
    setSelectedModel(model);
  };
  
  return (
    <div 
      className={`fixed inset-x-0 bottom-0 w-full bg-background shadow-lg transform transition-transform duration-300 ease-in-out z-50 flex flex-col border-t rounded-t-lg ${
        isOpen ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      {/* Bottom Sheet Content */}
      <div className="p-6 max-h-[70vh] overflow-y-auto">
        <h2 className="text-xl font-semibold">AI Model Settings</h2>
        <p className="text-muted-foreground mt-1 mb-6">
          Select your preferred AI provider and model for guidelines assistance
        </p>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : aiModels.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-muted-foreground mb-2">No AI models available</p>
            <Button
              variant="outline"
              onClick={() => router.push('/providerKeys')}
            >
              Configure AI Models
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center">
                <label className="text-sm font-medium w-24">AI Model:</label>
                <select
                  className="flex-1 p-2 border rounded bg-background"
                  onChange={handleModelChange}
                  value={selectedModel?.id || ""}
                >
                  <option value="">Select a model</option>
                  {aiModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.provider} - {model.name}
                      {model.model === 'gpt-4' && ' (Requires ChatGPT Plus)'}
                      {model.model === 'gpt-3.5-turbo' && ' (Available on free tier)'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {selectedModel && (
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2">Current Selection</h3>
                <div className="rounded-md bg-muted/50 overflow-hidden">
                  <div className="grid grid-cols-2 py-2 px-4 border-b">
                    <div className="font-medium">Provider:</div>
                    <div>{selectedModel.provider}</div>
                  </div>
                  <div className="grid grid-cols-2 py-2 px-4">
                    <div className="font-medium">Model:</div>
                    <div>{selectedModel.model}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Sheet Footer */}
      <div className="p-4 border-t space-y-2">
        <Button 
          className="w-full" 
          disabled={!selectedModel || isLoading}
          onClick={handleSaveSettings}
        >
          {isConfigured ? 'Update AI Model' : 'Configure & Start AI'}
        </Button>
        <Button variant="outline" className="w-full" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
};

// Main ProjectGuidelines component
const ProjectGuidelines = () => {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  // Project data states
  const [projectName, setProjectName] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [guidelineData, setGuidelineData] = useState<GuidelineData | null>(null);

  // Message and file handling states
  const [newMessage, setNewMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [uploadingFiles, setUploadingFiles] = useState<
    { file: File; progress: number }[]
  >([]);

  // AI configuration states
  const [aiConfig, setAiConfig] = useState<AIConfig>({
    provider: '',
    model: '',
    apiKey: '',
  });
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isAiConfigured, setIsAiConfigured] = useState(false);
  const [showAiSetupPrompt, setShowAiSetupPrompt] = useState(true);
  const [savedAiConfig, setSavedAiConfig] = useState<AIConfig | null>(null);

  // Knowledge sidebar state
  const [knowledgeSidebarOpen, setKnowledgeSidebarOpen] = useState(false);
  
  // AI Model selector state - now a bottom sheet
  const [aiBottomSheetOpen, setAiBottomSheetOpen] = useState(false);
  
  // Connected data sources (example data)
  const [dataSources, setDataSources] = useState<DataSource[]>([
    { 
      name: "Project Data Repository", 
      status: "connected", 
      icon: <Folder className="h-5 w-5 text-blue-500" />
    },
    { 
      name: "Knowledge Search", 
      status: "available", 
      icon: <Search className="h-5 w-5" />
    }
  ]);

  // Connection states for iframe
  const [showIframe, setShowIframe] = useState(false);
  
  // Handle connection to data sources
  const handleConnect = () => {
    setShowIframe(true);
  };
  
  // Handle returning from iframe view
  const handleBackFromIframe = () => {
    setShowIframe(false);
  };

  // Function to get fresh pre-signed URL for a file
  const getFreshFileUrl = async (s3Path: string): Promise<string | null> => {
    try {
      const response = await fetch(`/api/projects/${projectId}/guidelines/files/s3?s3Path=${encodeURIComponent(s3Path)}&regenerate=true`);
      const data = await response.json();
      if (data.success) {
        return data.fileUrl;
      } else {
        console.error('Failed to get fresh URL:', data.error);
        return null;
      }
    } catch (error) {
      console.error('Error getting fresh URL:', error);
      return null;
    }
  };

  // Function to handle file download with fresh URL
  const handleDownloadFile = async (file: File) => {
    try {
      toast.info('Generating download link...');
      const freshUrl = await getFreshFileUrl(file.s3Path);
      if (freshUrl) {
        // Create a temporary link to download the file
        const link = document.createElement('a');
        link.href = freshUrl;
        link.download = file.fileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Download started');
      } else {
        toast.error('Failed to generate download link');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Error downloading file');
    }
  };

  // Function to handle file opening with fresh URL
  const handleOpenFile = async (attachment: Attachment) => {
    try {
      const freshUrl = await getFreshFileUrl(attachment.s3Path);
      if (freshUrl) {
        window.open(freshUrl, '_blank');
      } else {
        toast.error('Failed to open file');
      }
    } catch (error) {
      console.error('Error opening file:', error);
      toast.error('Error opening file');
    }
  };

  // Fetch guidelines data on component mount
  useEffect(() => {
    fetchGuidelines();
    fetchProjectDetails();
  }, [projectId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

// Add this function before the main ProjectGuidelines component
const findLatestAIModelFromUserProjects = async (userId: string): Promise<{provider: string, model: string} | null> => {
  try {
    console.log(`[API] Calling /api/users/${userId}/projects/latest-ai-model`);
    const response = await fetch(`/api/users/${userId}/projects/latest-ai-model`);
    console.log(`[API] Response status: ${response.status} ${response.statusText}`);
    
    const data = await response.json();
    console.log('[API] Response data:', data);
    
    if (data.success && data.aiModel) {
      console.log('[API] ✅ Latest AI model found from API:', {
        provider: data.aiModel.provider,
        model: data.aiModel.model,
        projectName: data.aiModel.projectName,
        timestamp: data.aiModel.timestamp
      });
      return {
        provider: data.aiModel.provider,
        model: data.aiModel.model
      };
    } else {
      console.log('[API] ❌ No AI model in response or request failed:', {
        success: data.success,
        hasAiModel: !!data.aiModel,
        message: data.message,
        error: data.error
      });
      return null;
    }
  } catch (error) {
    console.error('[API] ❌ Network error calling latest-ai-model API:', error);
    console.log('[API] Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    return null;
  }
};

// Replace the existing useEffect with this updated version
useEffect(() => {
  // Logic for AI configuration status
  const aiMessages = messages.filter((msg) => msg.isAiMessage);
  if (messages.length > 0) {
    setShowAiSetupPrompt(false);
  }
  
  // Check if the guideline has AI configured at base level
  if (guidelineData?.aiProvider && guidelineData?.aiModel) {
    setIsAiConfigured(true);
  } else if (aiMessages.length > 0) {
    setIsAiConfigured(true);
  }

  // Try to find an associated AI model from the provider APIs
  const findAssociatedAIModel = async () => {
    if (guidelineData?.aiProvider && guidelineData?.aiModel) {
      console.log('[AI Config] Project already has AI configured:', {
        provider: guidelineData.aiProvider,
        model: guidelineData.aiModel
      });
      
      try {
        const response = await getProviderAIModels();
        if (response.success && response.models) {
          const matchingModel = response.models.find(
            model => model.provider === guidelineData.aiProvider && model.model === guidelineData.aiModel
          );
          
          if (matchingModel) {
            const modelConfig: AIConfig = {
              provider: matchingModel.provider,
              model: matchingModel.model,
              apiKey: matchingModel.apiKey,
              modelName: matchingModel.name
            };
            
            setAiConfig(modelConfig);
            setSavedAiConfig(modelConfig);
            setIsAiConfigured(true);
            setShowAiSetupPrompt(false);
            console.log('[AI Config] ✅ Existing AI configuration loaded successfully');
          }
        }
      } catch (error) {
        console.error('[AI Config] Error fetching AI models for existing config:', error);
      }
    } else {
      // For new projects (no existing AI config), automatically configure with latest used model
      if (session?.user?.id) {
        console.log(`[AI Auto-Config] Starting auto-configuration for project ${projectId} and user ${session.user.id}`);
        
        try {
          console.log('[AI Auto-Config] Fetching latest AI model from user projects...');
          const latestAIModel = await findLatestAIModelFromUserProjects(session.user.id);
          
          if (latestAIModel) {
            console.log('[AI Auto-Config] Latest AI model found:', {
              provider: latestAIModel.provider,
              model: latestAIModel.model
            });
            
            // Found a latest AI model, now get the full model config from provider APIs
            console.log('[AI Auto-Config] Fetching available AI models from providers...');
            const response = await getProviderAIModels();
            
            if (response.success && response.models) {
              console.log(`[AI Auto-Config] Retrieved ${response.models.length} available models from providers`);
              console.log('[AI Auto-Config] Available models:', response.models.map(m => `${m.provider}-${m.model}`));
              
              const matchingModel = response.models.find(
                model => model.provider === latestAIModel.provider && model.model === latestAIModel.model
              );
              
              if (matchingModel) {
                console.log('[AI Auto-Config] Matching model found in available models:', {
                  id: matchingModel.id,
                  name: matchingModel.name,
                  provider: matchingModel.provider,
                  model: matchingModel.model,
                  hasApiKey: !!matchingModel.apiKey
                });
                
                const modelConfig: AIConfig = {
                  provider: matchingModel.provider,
                  model: matchingModel.model,
                  apiKey: matchingModel.apiKey,
                  modelName: matchingModel.name
                };
                
                // Automatically configure the AI model without user intervention
                console.log('[AI Auto-Config] Configuring AI model automatically...');
                setAiConfig(modelConfig);
                setSavedAiConfig(modelConfig);
                setIsAiConfigured(true);
                setShowAiSetupPrompt(false);
                
                // Save to database immediately
                try {
                  console.log('[AI Auto-Config] Saving configuration to database...');
                  await saveAIModelToGuideline(modelConfig);
                  console.log('[AI Auto-Config] ✅ Auto-configured AI model saved to database successfully');
                } catch (saveError) {
                  console.error('[AI Auto-Config] ❌ Error saving auto-configured AI model to database:', saveError);
                }
                
                // Show success toast
                toast.success(`AI assistant ready with ${matchingModel.name}`, {
                  description: 'Using your previously configured model',
                  duration: 3000,
                });
                
                console.log('[AI Auto-Config] ✅ Auto-configuration completed successfully');
                return; // Successfully configured
              } else {
                console.log('[AI Auto-Config] ❌ No matching model found in available models');
                console.log('[AI Auto-Config] Looking for:', `${latestAIModel.provider}-${latestAIModel.model}`);
                console.log('[AI Auto-Config] Available models:', response.models.map(m => `${m.provider}-${m.model}-${m.id}`));
              }
            } else {
              console.log('[AI Auto-Config] ❌ Failed to fetch available models from providers');
              console.log('[AI Auto-Config] Response:', {
                success: response.success,
                error: response.error,
                modelCount: response.models ? response.models.length : 'undefined'
              });
            }
          } else {
            console.log('[AI Auto-Config] ❌ No latest AI model found in user projects');
          }
          
          // If no latest model found or configuration failed, keep setup prompt
          console.log('[AI Auto-Config] ❌ Auto-configuration failed - showing manual setup prompt');
          console.log('[AI Auto-Config] Reasons could be:');
          console.log('  - No previous AI usage in any user projects');
          console.log('  - Latest model no longer available in current provider configurations');
          console.log('  - API key missing for the model');
          console.log('  - Network error or API failure');
        } catch (error) {
          console.error('[AI Auto-Config] ❌ Exception during auto-configuration:', error);
          console.log('[AI Auto-Config] Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
          });
        }
      } else {
        console.log('[AI Auto-Config] ❌ No user session found - cannot auto-configure');
      }
    }
  };
  
  findAssociatedAIModel();
  
}, [messages, projectId, guidelineData, session?.user?.id]);

  const fetchProjectDetails = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      const data = await response.json();
      if (data.success) {
        setProjectName(data.project.name || '');
      }
    } catch (error) {
      console.error('Error fetching project details:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchGuidelines = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}/guidelines`);
      const data = await response.json();
      if (data.success) {
        setMessages(data.messages || []);
        setFiles(data.files || []);
        setGuidelineData({
          description: data.description || '',
          messages: data.messages || [],
          files: data.files || [],
          aiProvider: data.aiProvider,
          aiModel: data.aiModel
        });
      } else {
        toast.error('Failed to load guidelines');
      }
    } catch (error) {
      console.error('Error fetching guidelines:', error);
      toast.error('An error occurred while loading guidelines');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !selectedFiles.length) return;

    try {
      // Prepare file attachments for UI message
      const attachments = selectedFiles.map((file) => ({
        fileName: file.fileName,
        fileType: file.fileType,
        fileSize: file.fileSize,
        fileUrl: file.fileUrl,
        s3Path: file.s3Path,
      }));

      // Send user's message
      const response = await fetch(`/api/projects/${projectId}/guidelines`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content:
            newMessage ||
            (selectedFiles.length > 0
              ? `I've uploaded ${selectedFiles.length} PDF file(s)`
              : ''),
          attachments,
        }),
      });
      const data = await response.json();

      if (data.success) {
        // Optimistic UI update for user message
        const optimisticMessage = {
          ...data.message,
          sender: {
            _id: session?.user.id || '',
            name: session?.user.name || '',
            email: session?.user.email || '',
          },
        };
        setMessages((prev) => [...prev, optimisticMessage]);

        // Process AI response if configured
        if (isAiConfigured && aiConfig.apiKey) {
          const aiAttachments = await Promise.all(
            selectedFiles.map(async (file) => {
              const originalFile = file.originalFile;
              let fileContent = null;
              if (originalFile) {
                try {
                  fileContent = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target?.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(originalFile);
                  });
                } catch (error) {
                  console.error(`Error reading PDF content for ${file.fileName}:`, error);
                }
              }
              return {
                fileName: file.fileName,
                fileType: file.fileType,
                content: fileContent,
                fileUrl: file.fileUrl,
                s3Path: file.s3Path,
              };
            })
          );
          await generateAIResponse(
            newMessage || `I've uploaded ${selectedFiles.length} PDF file(s)`,
            aiAttachments
          );
        } else if (!isAiConfigured) {
          toast.info('Configure AI assistant to get automated responses', {
            action: {
              label: 'Configure',
              onClick: () => setAiBottomSheetOpen(true),
            },
          });
        }

        setNewMessage('');
        setSelectedFiles([]);
      } else {
        toast.error(data.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('An error occurred while sending your message');
    }
  };

  const generateAIResponse = async (
    userMessage: string,
    additionalAttachments?: FileAttachment[]
  ) => {
    if (!isAiConfigured || !aiConfig.apiKey) {
      toast.error('AI assistant not properly configured');
      return;
    }
    setIsGeneratingAI(true);
    try {
      const conversationContext = messages
        .map((msg) => `${msg.sender.name}: ${msg.content}`)
        .join('\n');
      const prompt = `
        Project Name: ${projectName}
        Recent Conversation:
        ${conversationContext}
        User's message: ${userMessage}
        Please provide a helpful, professional response as the AI assistant for this project. If PDF files are attached, analyze their content and provide relevant insights.
      `;
      const attachments = additionalAttachments || [];

      const response = await generateAIResponseWithAttachments(
        aiConfig.provider,
        aiConfig.model,
        prompt,
        projectId,
        aiConfig.apiKey,
        attachments.length > 0 ? attachments : undefined
      );

      if (response) {
        // First save to server to get the proper _id and timestamp
        const saveResponse = await fetch(`/api/projects/${projectId}/guidelines`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: response,
            isAiMessage: true,
            aiProvider: aiConfig.provider,
            aiModel: aiConfig.model,
          }),
        });
        
        const saveData = await saveResponse.json();
        
        if (saveResponse.ok && saveData.success) {
          // Use the server-returned message if available
          const aiResponseMessage = saveData.message || {
            _id: `ai-response-${Date.now()}`,
            sender: {
              _id: 'ai-assistant',
              name: `${aiConfig.modelName || aiConfig.provider} Assistant`,
              email: 'ai@assistant.com',
              image: '/ai-assistant-avatar.png',
            },
            content: response,
            timestamp: new Date().toISOString(),
            attachments: [],
            isAiMessage: true,
            aiProvider: aiConfig.provider,
            aiModel: aiConfig.model,
          };
          
          setMessages((prev) => [...prev, aiResponseMessage]);
        } else {
          // Fallback to local message if server save failed
          const aiResponseMessage = {
            _id: `ai-response-${Date.now()}`,
            sender: {
              _id: 'ai-assistant',
              name: `${aiConfig.modelName || aiConfig.provider} Assistant`,
              email: 'ai@assistant.com',
              image: '/ai-assistant-avatar.png',
            },
            content: response,
            timestamp: new Date().toISOString(),
            attachments: [],
            isAiMessage: true,
            aiProvider: aiConfig.provider,
            aiModel: aiConfig.model,
          };
          
          setMessages((prev) => [...prev, aiResponseMessage]);
          console.error('Error saving AI message to server');
        }
      }
    } catch (error) {
      console.error('Error generating AI response:', error);
      
      // Enhanced error handling with beautiful toast messages
      const { title, message, action } = parseAIError(error);
      
      toast.error(title, {
        description: message,
        action: action ? {
          label: action,
          onClick: () => {
            if (action === 'Configure Different Model') {
              setAiBottomSheetOpen(true);
            } else if (action === 'Update API Key') {
              router.push('/providerKeys');
            } else if (action === 'Try Again Later' || action === 'Retry') {
              // Could implement retry logic here
              return;
            }
          },
        } : undefined,
        duration: 8000, // Longer duration for error messages
      });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Save AI model to the guideline level in the database
  const saveAIModelToGuideline = async (config: AIConfig) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/guidelines`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          aiConfig: {
            provider: config.provider,
            model: config.model
          }
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        // Update local guideline data
        setGuidelineData(prev => prev ? {
          ...prev,
          aiProvider: config.provider,
          aiModel: config.model
        } : null);
        
        return true;
      } else {
        console.error('Failed to save AI model to guideline:', data.error);
        return false;
      }
    } catch (error) {
      console.error('Error saving AI model to guideline:', error);
      return false;
    }
  };

  // Configure and train the selected AI model
  const configureAndTrainAI = async (config?: AIConfig) => {
    const configToUse = config || aiConfig;
    
    if (!configToUse.apiKey || !configToUse.provider || !configToUse.model) {
      toast.error('Please select a valid AI model');
      return;
    }
    
    setIsGeneratingAI(true);
    try {
      // Save to database at guideline level
      const savedToGuideline = await saveAIModelToGuideline(configToUse);
      if (!savedToGuideline) {
        console.log('Warning: Could not save AI model to guideline in database');
      }
      
      // Save to local storage as backup
      try {
        localStorage.setItem(`project_${projectId}_ai_config`, JSON.stringify(configToUse));
      } catch (storageError) {
        console.log('Could not save to localStorage:', storageError);
      }

      // Update state with the new config
      setAiConfig(configToUse);
      setSavedAiConfig(configToUse);
      setIsAiConfigured(true);
      setShowAiSetupPrompt(false);

      // If this is the first setup, generate an intro response
      if (!isAiConfigured || messages.length === 0) {
        // Training prompt
        const trainingPrompt = `
          Project Name: ${projectName}
          This AI will assist with project guidelines and answering questions related to this project.
          The AI should maintain a professional and helpful tone, reference project details when relevant, assist with clarifying guidelines or requirements, and help team members understand project context.
          Please introduce yourself as an AI assistant for the "${projectName}" project with a brief, professional message.
        `;

        // Generate intro response
        const response = await generateAIResponseWithAttachments(
          configToUse.provider,
          configToUse.model,
          trainingPrompt,
          projectId,
          configToUse.apiKey
        );

        if (response) {
          // Save intro message to server with aiProvider and aiModel fields
          const messageResponse = await fetch(`/api/projects/${projectId}/guidelines`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: response,
              isAiMessage: true,
              aiProvider: configToUse.provider,
              aiModel: configToUse.model,
            }),
          });
          
          if (messageResponse.ok) {
            const messageData = await messageResponse.json();
            if (messageData.success) {
              // Use the server-returned message if available, otherwise create a local version
              const aiMessage = messageData.message || {
                _id: `ai-intro-${Date.now()}`,
                sender: {
                  _id: 'ai-assistant',
                  name: `${configToUse.modelName || configToUse.provider} Assistant`,
                  email: 'ai@assistant.com',
                  image: '/ai-assistant-avatar.png',
                },
                content: response,
                timestamp: new Date().toISOString(),
                attachments: [],
                isAiMessage: true,
                aiProvider: configToUse.provider,
                aiModel: configToUse.model,
              };
              
              // Add message to the UI
              setMessages((prev) => [...prev, aiMessage]);
              toast.success('AI assistant is ready to help with this project');
            }
          } else {
            // Fallback if server request failed
            const aiMessage = {
              _id: `ai-intro-${Date.now()}`,
              sender: {
                _id: 'ai-assistant',
                name: `${configToUse.modelName || configToUse.provider} Assistant`,
                email: 'ai@assistant.com',
                image: '/ai-assistant-avatar.png',
              },
              content: response,
              timestamp: new Date().toISOString(),
              attachments: [],
              isAiMessage: true,
              aiProvider: configToUse.provider,
              aiModel: configToUse.model,
            };
            
            setMessages((prev) => [...prev, aiMessage]);
            toast.success('AI assistant is ready to help with this project');
          }
        } else {
          toast.error('Failed to train AI assistant');
        }
      } else {
        toast.success(`Updated to ${configToUse.modelName || configToUse.model} as your AI assistant`);
      }
    } catch (error) {
      console.error('Error configuring AI:', error);
      
      // Enhanced error handling for configuration
      const { title, message } = parseAIError(error);
      toast.error(title, {
        description: message,
        duration: 6000,
      });
    } finally {
      setIsGeneratingAI(false);
      setAiBottomSheetOpen(false);
    }
  };

  // Handler for AI model selection from the bottom sheet
  const handleSelectedAIModel = (config: AIConfig) => {
    // Call the configure and train function with the selected config
    configureAndTrainAI(config);
  };

  // Updated extractPDFText function with better error handling
  const extractPDFText = async (file) => {
    try {
      const text = await pdfToText(file);
      return text.trim();
    } catch (error) {
      console.error('Failed to extract text from PDF:', error);
      return null;
    }
  };

  // Updated sendPDFContentMessage function with text truncation
  const sendPDFContentMessage = async (fileName, extractedText) => {
    try {
      // Truncate text if it's too long
      const { text: truncatedText, wasTruncated } = truncateText(extractedText, MAX_PDF_TEXT_LENGTH);
      
      let content = `📄 **Uploaded: ${fileName}**\n\n${truncatedText}`;
      
      if (wasTruncated) {
        content += `\n\n*Note: PDF content was truncated due to length. The full content is available in the file.*`;
      }
      
      const response = await fetch(`/api/projects/${projectId}/guidelines`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content,
          isAiMessage: false,
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        const systemMessage = {
          ...data.message,
          sender: {
            _id: 'system',
            name: 'System',
            email: 'system@app.com',
          },
        };
        setMessages((prev) => [...prev, systemMessage]);
        return true;
      } else {
        console.error('Failed to send PDF content message:', data.error);
        return false;
      }
    } catch (error) {
      console.error('Error sending PDF content message:', error);
      return false;
    }
  };

  // Updated handleFileUpload function with size limit validation
  const handleFileUpload = async (files: FileList) => {
    if (!files.length) return;

    setUploading(true);
    const file = files[0];

    try {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (!isPdf) {
        toast.error(`${file.name} is not a PDF file. Only PDF files are supported.`);
        return;
      }

      // Check file size limit
      if (file.size > MAX_PDF_SIZE) {
        toast.error(`File size exceeds the ${formatFileSize(MAX_PDF_SIZE)} limit. Please choose a smaller file.`);
        return;
      }

      const contentType = 'application/pdf';

      // 1. Extract PDF text content first
      toast.info('Extracting PDF content...');
      const extractedText = await extractPDFText(file);
      
      if (!extractedText) {
        toast.error('Could not extract text from PDF. The file might be image-based or corrupted.');
        return;
      }

      // 2. Get pre-signed URL
      const presignedUrlResponse = await fetch(`/api/projects/${projectId}/guidelines/files/s3`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType }),
      });
      const { url, s3Path, fileId } = await presignedUrlResponse.json();
      if (!url) throw new Error('Failed to get upload URL');

      // 3. Upload to S3
      const fileBlob = new Blob([file], { type: contentType });
      const uploadResponse = await fetch(url, { 
        method: 'PUT', 
        body: fileBlob, 
        headers: { 'Content-Type': contentType } 
      });
      if (!uploadResponse.ok) throw new Error('File upload failed');

      // 4. Get final S3 URL
      const s3UrlResponse = await fetch(`/api/projects/${projectId}/guidelines/files/s3?s3Path=${encodeURIComponent(s3Path)}`);
      const s3UrlData = await s3UrlResponse.json();
      if (!s3UrlData.success) throw new Error('Failed to generate S3 URL');
      const fileUrl = s3UrlData.fileUrl;

      // 5. Register file with our API
      const registerResponse = await fetch(`/api/projects/${projectId}/guidelines/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fileName: file.name, 
          fileType: contentType, 
          fileSize: file.size, 
          fileUrl, 
          s3Path 
        }),
      });
      const registeredFile = await registerResponse.json();
      if (!registeredFile.success) throw new Error('Failed to register file');

      // 6. Send PDF content as a message
      toast.info('Adding PDF content to conversation...');
      const contentSent = await sendPDFContentMessage(file.name, extractedText);
      
      if (contentSent) {
        // 7. Update files state
        const newFile = {
          fileName: file.name,
          fileType: contentType,
          fileSize: file.size,
          fileUrl,
          s3Path,
          uploadedAt: registeredFile.file?.uploadedAt || new Date().toISOString(),
          uploadedBy: registeredFile.file?.uploadedBy || { 
            _id: session?.user.id || '', 
            name: session?.user.name || '', 
            email: session?.user.email || '' 
          },
        };
        
        setFiles(prev => [...prev, newFile]);
        toast.success(`${file.name} uploaded and content added to conversation`);
      } else {
        toast.error('File uploaded but failed to add content to conversation');
      }

    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isAiConfigured) {
        handleSendMessage();
      }
    }
  };

  // getFileIcon remains the same
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Image className='h-4 w-4' />;
    }
    return <FileText className='h-4 w-4' />;
  };

  // FileInput component (for reuse)
  const FileInput = () => (
    <>
      <Button
        type='button'
        size='icon'
        variant='outline'
        className='h-10 w-10 p-0'
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading || !isAiConfigured}
        title={!isAiConfigured ? 'Configure AI assistant to attach files' : `Attach PDF file (max ${formatFileSize(MAX_PDF_SIZE)})`}
      >
        <Upload className={`h-6 w-6 ${!isAiConfigured ? 'opacity-50' : ''}`} />
        <span className='sr-only'>Attach PDF</span>
      </Button>
      <input
        type='file'
        ref={fileInputRef}
        className='hidden'
        accept='.pdf,application/pdf'
        multiple
        onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
        disabled={!isAiConfigured}
      />
    </>
  );

  // Render Loading state
  if (loading) {
    return <Loader />;
  }

  // Helper to get model info for display
  const getModelDisplayInfo = (message: Message) => {
    // First try the message-specific info
    if (message.aiProvider && message.aiModel) {
      return `${message.aiProvider} - ${message.aiModel}`;
    }
    
    // Then try the guideline-level info
    if (guidelineData?.aiProvider && guidelineData?.aiModel) {
      return `${guidelineData.aiProvider} - ${guidelineData.aiModel}`;
    }
    
    // Fallback to saved config
    if (savedAiConfig) {
      return `${savedAiConfig.provider} - ${savedAiConfig.modelName || savedAiConfig.model}`;
    }
    
    // Generic fallback
    return 'AI Assistant';
  };

  // Main Component Return
  return (
    <Card className='w-full'>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className='text-2xl'>Project Guidelines Assistant</CardTitle>
          <p className="text-muted-foreground text-sm mt-1">
            Ask questions about guidelines using your preferred AI model
            {isAiConfigured && (
              <span className="ml-1">
                (Currently using: <span className="font-medium">
                  {guidelineData?.aiProvider && guidelineData?.aiModel 
                    ? `${guidelineData.aiProvider} - ${guidelineData.aiModel}`
                    : savedAiConfig?.provider && savedAiConfig?.modelName 
                      ? `${savedAiConfig.provider} - ${savedAiConfig.modelName}` 
                      : savedAiConfig?.provider && savedAiConfig?.model
                        ? `${savedAiConfig.provider} - ${savedAiConfig.model}`
                        : 'AI Assistant'
                  }
                </span>)
              </span>
            )}
          </p>
        </div>
        <div className='flex gap-2'>
          {/* AI Settings Button - Now opens bottom sheet */}
          <Button
            size='sm'
            variant='outline'
            onClick={() => setAiBottomSheetOpen(true)}
          >
            <Settings className='h-4 w-4 mr-2' />
            AI Settings
          </Button>
          
          {/* Knowledge Files Button - Opens the sidebar */}
          <Button
            size='sm'
            variant='outline'
            onClick={() => setKnowledgeSidebarOpen(true)}
          >
            <FileText className='h-4 w-4 mr-2' />
            Knowledge Files
          </Button>
        </div>
      </CardHeader>

      {/* Chat View */}
      <CardContent className='p-6'>
        <div className='space-y-4'>
          {/* Messages Container */}
          <div className='bg-muted/40 rounded-lg border'>
            {!isAiConfigured && showAiSetupPrompt && messages.length === 0 ? (
              // Initial AI Setup Prompt
              <div className='flex flex-col items-center justify-center h-[400px] text-center px-4'>
                <Bot className='h-16 w-16 mb-4 opacity-60' />
                <h3 className='text-xl font-medium mb-2'>Configure AI Assistant</h3>
                <p className='text-muted-foreground max-w-md mb-6'>
                  To get started with project guidelines, select an AI model that will help manage conversations and answer questions about this project.
                </p>
                <Button onClick={() => setAiBottomSheetOpen(true)}>
                  Select AI Model
                </Button>
              </div>
            ) : (
              // Chat Message Area
              <ScrollArea className='h-[400px] px-4 pt-4'>
                {messages.length === 0 ? (
                  // Show the welcome message
                  <div className='flex flex-col items-start justify-start'>
                    <div className='flex'>
                      <div className='flex-shrink-0 mr-2'>
                        <Avatar className='h-8 w-8'>
                          <AvatarImage src='/ai-assistant-avatar.png' alt='Assistant' />
                          <AvatarFallback>AI</AvatarFallback>
                        </Avatar>
                      </div>
                      <div className='bg-blue-100 dark:bg-blue-950 max-w-[80%] rounded-lg p-3'>
                        <div className='font-semibold text-xs mb-1 flex items-center'>
                          <Bot className='h-3 w-3 mr-1' />Assistant
                        </div>
                        <div className='whitespace-pre-wrap'>
                          Hello! I'm your project guidelines assistant. You can ask me questions about your project guidelines or upload new documents to enhance my knowledge base.
                        </div>
                        <div className='text-xs text-right mt-1 opacity-70'>
                          {formatDistanceToNow(new Date(), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Display Messages
                  <div className='space-y-4'>
                    {messages.map((message) => (
                      <div
                        key={message._id}
                        className={`flex ${
                          message.isAiMessage
                            ? 'justify-start'
                            : message.sender._id === session?.user.id
                              ? 'justify-end'
                              : 'justify-start'
                        }`}
                      >
                        {/* Avatar (AI or other users) */}
                        {(message.isAiMessage || message.sender._id !== session?.user.id) && (
                          <div className='flex-shrink-0 mr-2'>
                            <Avatar className='h-8 w-8'>
                              <AvatarImage src={message.isAiMessage ? '/ai-assistant-avatar.png' : message.sender.image} alt={message.sender.name} />
                              <AvatarFallback>{message.isAiMessage ? 'AI' : message.sender.name?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
                            </Avatar>
                          </div>
                        )}

                        {/* Message Bubble */}
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            message.isAiMessage
                              ? 'bg-blue-100 dark:bg-blue-950'
                              : message.sender._id === session?.user.id
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                          }`}
                        >
                          {/* Sender Name (other users) */}
                          {!message.isAiMessage && message.sender._id !== session?.user.id && (
                            <div className='font-semibold text-xs mb-1'>{message.sender.name}</div>
                          )}
                          {/* AI Label */}
                          {message.isAiMessage && (
                            <div className='font-semibold text-xs mb-1 flex items-center'>
                              <Bot className='h-3 w-3 mr-1' />{message.sender.name}
                            </div>
                          )}
                          {/* Content */}
                        <div className='whitespace-pre-wrap'>{message.content}</div>
                          {message.isAiMessage && (
                            <div className="text-xs opacity-60 mt-1">
                              Generated by {getModelDisplayInfo(message)}
                            </div>
                          )}
                          {/* Attachments */}
                          {message.attachments && message.attachments.length > 0 && (
                            <div className='mt-2 space-y-1'>
                              {message.attachments.map((attachment, index) => (
                                <div 
                                  key={index} 
                                  className='flex items-center text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer'
                                  onClick={() => handleOpenFile(attachment)}
                                >
                                  {getFileIcon(attachment.fileType)}
                                  <span className='ml-1 truncate'>{attachment.fileName}</span>
                                  <ExternalLink className='h-3 w-3 ml-1' />
                                </div>
                              ))}
                            </div>
                          )}
                          {/* Timestamp */}
                          <div className='text-xs text-right mt-1 opacity-70'>
                            {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                          </div>
                        </div>

                        {/* Avatar (Current User) */}
                        {!message.isAiMessage && message.sender._id === session?.user.id && (
                          <div className='flex-shrink-0 ml-2'>
                            <Avatar className='h-8 w-8'>
                              <AvatarFallback>{session?.user.name?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                            </Avatar>
                          </div>
                        )}
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>
            )}

            {/* Selected files preview (before sending) */}
            {selectedFiles.length > 0 && (
              <div className='px-4 py-2 border-t'>
                <div className='text-xs font-medium mb-2'>Selected Files:</div>
                <div className='flex flex-wrap gap-2'>
                  {selectedFiles.map((file, index) => (
                    <div key={index} className='flex items-center bg-muted rounded-full pl-2 pr-1 py-1 text-xs'>
                      {getFileIcon(file.fileType)}
                      <span className='max-w-[150px] truncate mr-1' title={file.fileName}>{file.fileName}</span>
                      <Button type='button' variant='ghost' size='icon' className='h-4 w-4 rounded-full hover:bg-muted-foreground/20' onClick={() => removeSelectedFile(index)}>
                        <X className='h-3 w-3' /> <span className='sr-only'>Remove</span>
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Uploading files progress */}
            {uploadingFiles.length > 0 && (
              <div className='px-4 py-2 border-t'>
                <div className='text-xs font-medium mb-2'>Uploading:</div>
                <div className='space-y-2'>
                  {uploadingFiles.map((uploadingFile, index) => (
                    <div key={index} className='flex items-center text-xs'>
                       <div className='w-4 h-4 mr-2 flex-shrink-0'>
                         {uploadingFile.progress < 100 ? (
                           <Loader2 className='h-4 w-4 animate-spin' />
                         ) : (
                           <div className='h-4 w-4 rounded-full bg-green-500 flex items-center justify-center'>
                             <span className='text-white text-[8px]'>✓</span>
                           </div>
                         )}
                       </div>
                       <div className='flex-1 truncate' title={uploadingFile.file.fileName}>{uploadingFile.file.fileName}</div>
                       <div className='ml-2'>{uploadingFile.progress}%</div>
                     </div>
                  ))}
                </div>
              </div>
            )}

            {/* Message Input Area */}
             <div className={`p-3 border-t flex gap-2 items-center ${!isAiConfigured ? 'opacity-50 pointer-events-none': ''}`}>
               <Textarea
                 value={newMessage}
                 onChange={(e) => setNewMessage(e.target.value)}
                 onKeyDown={handleKeyPress}
                 placeholder="Ask about project guidelines..."
                 className='min-h-[40px] resize-none flex-1 py-2 px-3'
                 disabled={!isAiConfigured}
               />
               <div className="flex items-center">
                 <Button
                   type='button'
                   variant="ghost"
                   size='icon'
                   className="mr-1"
                   disabled={!isAiConfigured}
                 >
                   <div className="flex h-10 w-10 items-center justify-center rounded-md">
                     <FileInput />
                   </div>
                 </Button>
                 <Button
                   type='button'
                   size='icon'
                   className="rounded-full h-10 w-10 bg-primary hover:bg-primary/90"
                   onClick={handleSendMessage}
                   disabled={
                     !isAiConfigured ||
                     (newMessage.trim() === '' && selectedFiles.length === 0) ||
                     uploading || isGeneratingAI
                   }
                   title={!isAiConfigured ? 'Configure AI assistant' : 'Send Message'}
                 >
                   {uploading || isGeneratingAI ? (
                     <Loader2 className='h-5 w-5 animate-spin text-white' />
                   ) : (
                     <Send className='h-5 w-5 text-white' />
                   )}
                   <span className='sr-only'>Send</span>
                 </Button>
               </div>
             </div>
          </div>
        </div>
      </CardContent>

      {/* Knowledge Files Sidebar */}
      <KnowledgeSidebar 
        isOpen={knowledgeSidebarOpen}
        onClose={() => setKnowledgeSidebarOpen(false)}
        files={files}
        fileInputRef={fileInputRef}
        showIframe={showIframe}
        setShowIframe={setShowIframe}
        handleConnect={handleConnect}
        handleBackFromIframe={handleBackFromIframe}
        onDownloadFile={handleDownloadFile}
      />

      {/* AI Model Bottom Sheet */}
      <AIModelBottomSheet
        isOpen={aiBottomSheetOpen}
        onClose={() => setAiBottomSheetOpen(false)}
        onSelect={handleSelectedAIModel}
        isLoading={isGeneratingAI}
        currentConfig={savedAiConfig}
        isConfigured={isAiConfigured}
      />

      {/* Add overlay when sidebar is open for small screens */}
      {knowledgeSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-40 lg:hidden" 
          onClick={() => setKnowledgeSidebarOpen(false)}
        />
      )}
      
      {/* Add overlay when bottom sheet is open */}
      {aiBottomSheetOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-40" 
          onClick={() => setAiBottomSheetOpen(false)}
        />
      )}
    </Card>
  );
};

export default ProjectGuidelines;