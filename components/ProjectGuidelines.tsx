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
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  generateAIResponseWithAttachments,
  getProviderAIModels,
} from '@/app/actions/providerAIModel';
import Loader from './ui/NewLoader/Loader';

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
  handleBackFromIframe
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
                {files.length > 0 && files.filter(f => 
                  f.fileName !== "Project Overview.pdf" && 
                  f.fileName !== "Design Guidelines.docx"
                ).map((file, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-3 border-0 bg-muted/20 rounded-md"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-blue-500">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-medium">{file.fileName}</div>
                        <div className="text-xs text-muted-foreground">
                          {typeof file.fileSize === 'number' ? 
                            `${(file.fileSize / (1024 * 1024)).toFixed(1)} MB` : 
                            '0.0 MB'} • {
                              new Date(file.uploadedAt).toLocaleDateString('en-US', {
                                month: 'numeric',
                                day: 'numeric',
                                year: 'numeric'
                              }).replace(/\//g, '/')
                            }
                        </div>
                      </div>
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

// AIModelSelector component remains the same
const AIModelSelector: React.FC<AIModelSelectorProps> = ({
  onSelect,
  isLoading,
}) => {
  const [aiModels, setAiModels] = useState<AIModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchModels = async () => {
      setLoading(true);
      try {
        const response = await getProviderAIModels();
        if (response.success && response.models) {
          setAiModels(response.models);
          if (response.models.length > 0 && !selectedModelId) {
            const firstModel = response.models[0];
            setSelectedModelId(firstModel.id);
            onSelect({
              provider: firstModel.provider,
              model: firstModel.model,
              apiKey: firstModel.apiKey,
            });
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
    fetchModels();
  }, [selectedModelId, onSelect]); // Removed dependency on aiModels to prevent potential loop

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedModelId(id);
    if (id) {
      const selectedModel = aiModels.find((model) => model.id === id);
      if (selectedModel) {
        onSelect({
          provider: selectedModel.provider,
          model: selectedModel.model,
          apiKey: selectedModel.apiKey,
          modelName: selectedModel.name,
        });
      }
    }
  };

  if (loading) {
    return <Loader />;
  }

  if (aiModels.length === 0) {
    return (
      <div className='text-center py-4'>
        <p className='text-muted-foreground mb-2'>No AI models available</p>
        <Button
          variant='outline'
          onClick={() => (window.location.href = '/settings/ai-models')}
        >
          Add New AI Model
        </Button>
      </div>
    );
  }

  return (
    <div className='space-y-2'>
      <label className='text-sm font-medium'>
        Select AI Model <span className='text-red-500'>*</span>
      </label>
      <select
        className='w-full p-2 border rounded'
        value={selectedModelId}
        onChange={handleModelChange}
        disabled={isLoading}
        required
      >
        <option value=''>Choose an AI Model</option>
        {aiModels.map((model) => (
          <option key={model.id} value={model.id}>
            {model.name} ({model.provider} - {model.model})
          </option>
        ))}
      </select>

      {selectedModelId && (
        <div className='rounded-md bg-muted p-3 text-sm'>
          <p className='font-medium'>Selected Model Information:</p>
          <ul className='mt-1 space-y-1 text-muted-foreground'>
            <li>
              Name: {aiModels.find((m) => m.id === selectedModelId)?.name}
            </li>
            <li>
              Provider:{' '}
              {aiModels.find((m) => m.id === selectedModelId)?.provider}
            </li>
            <li>
              Model: {aiModels.find((m) => m.id === selectedModelId)?.model}
            </li>
          </ul>
        </div>
      )}
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
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [isAiConfigured, setIsAiConfigured] = useState(false);
  const [showAiSetupPrompt, setShowAiSetupPrompt] = useState(true);
  const [savedAiConfig, setSavedAiConfig] = useState<AIConfig | null>(null);

  // Knowledge sidebar state - changed from dialog to sidebar
  const [knowledgeSidebarOpen, setKnowledgeSidebarOpen] = useState(false);
  
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

  // Fetch guidelines data on component mount
  useEffect(() => {
    fetchGuidelines();
    fetchProjectDetails();
  }, [projectId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Logic for AI configuration status
    const aiMessages = messages.filter((msg) => msg.isAiMessage);
    if (messages.length > 0) {
      setShowAiSetupPrompt(false);
    }
    if (aiMessages.length > 0) {
      setIsAiConfigured(true);
    }

    const fetchAiConfig = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/ai-config`);
        if (!res.ok) {
          console.log(`API endpoint returned ${res.status}: ${res.statusText}`);
          try {
            const savedConfig = localStorage.getItem(`project_${projectId}_ai_config`);
            if (savedConfig) {
              const parsedConfig = JSON.parse(savedConfig);
              setSavedAiConfig(parsedConfig);
              setAiConfig(parsedConfig);
              if (parsedConfig.provider && parsedConfig.model && parsedConfig.apiKey) {
                setIsAiConfigured(true);
              }
            }
          } catch (localStorageError) {
            console.log('Could not load from localStorage:', localStorageError);
          }
          return;
        }
        const data = await res.json();
        if (data.success && data.config) {
          setSavedAiConfig(data.config);
          setAiConfig(data.config);
          if (data.config.provider && data.config.model && data.config.apiKey) {
            setIsAiConfigured(true);
          }
        }
      } catch (error) {
        console.log('Error fetching AI config (may be a missing endpoint):', error);
        try {
          const savedConfig = localStorage.getItem(`project_${projectId}_ai_config`);
          if (savedConfig) {
            const parsedConfig = JSON.parse(savedConfig);
            setSavedAiConfig(parsedConfig);
            setAiConfig(parsedConfig);
            if (parsedConfig.provider && parsedConfig.model && parsedConfig.apiKey) {
              setIsAiConfigured(true);
            }
          }
        } catch (localStorageError) {
          console.log('Could not load from localStorage:', localStorageError);
        }
      }
    };
    fetchAiConfig();
  }, [messages, projectId]);

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
              onClick: () => setAiModalOpen(true),
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
        };
        setMessages((prev) => [...prev, aiResponseMessage]);

        // Save AI message to server
        await fetch(`/api/projects/${projectId}/guidelines`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: response,
            isAiMessage: true,
            aiProvider: aiConfig.provider,
            aiModel: aiConfig.model,
          }),
        });
      }
    } catch (error) {
      console.error('Error generating AI response:', error);
      toast.error('Failed to generate AI response');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const configureAndTrainAI = async () => {
    if (!aiConfig.apiKey || !aiConfig.provider || !aiConfig.model) {
      toast.error('Please configure all AI settings');
      return;
    }
    setIsGeneratingAI(true);
    try {
      // Save config attempt (optional)
      try {
        const configResponse = await fetch(`/api/projects/${projectId}/ai-config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config: aiConfig }),
        });
        if (!configResponse.ok) console.log(`Warning: Could not save AI config. Status: ${configResponse.status}`);
      } catch (configError) {
        console.log('Error saving AI config (endpoint may not exist):', configError);
      }
      // Local storage fallback
      try {
        localStorage.setItem(`project_${projectId}_ai_config`, JSON.stringify(aiConfig));
      } catch (storageError) {
        console.log('Could not save to localStorage:', storageError);
      }

      // Training prompt
      const trainingPrompt = `
        Project Name: ${projectName}
        This AI will assist with project guidelines and answering questions related to this project.
        The AI should maintain a professional and helpful tone, reference project details when relevant, assist with clarifying guidelines or requirements, and help team members understand project context.
        Please introduce yourself as an AI assistant for the "${projectName}" project with a brief, professional message.
      `;

      // Generate intro response
      const response = await generateAIResponseWithAttachments(
        aiConfig.provider,
        aiConfig.model,
        trainingPrompt,
        projectId,
        aiConfig.apiKey
      );

      if (response) {
        const aiMessage = {
          _id: `ai-intro-${Date.now()}`,
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
        };
        setMessages((prev) => [...prev, aiMessage]);
        setIsAiConfigured(true);
        setShowAiSetupPrompt(false);

        // Save intro message to server
        await fetch(`/api/projects/${projectId}/guidelines`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: response,
            isAiMessage: true,
            aiProvider: aiConfig.provider,
            aiModel: aiConfig.model,
          }),
        });
        toast.success('AI assistant is ready to help with this project');
      } else {
        toast.error('Failed to train AI assistant');
      }
    } catch (error) {
      console.error('Error training AI:', error);
      toast.error('Error setting up AI assistant');
    } finally {
      setIsGeneratingAI(false);
      setAiModalOpen(false);
    }
  };

  const handleFileUpload = async (files: FileList) => {
    if (!files.length) return;

    setUploading(true);
    const filesToUpload = Array.from(files);
    const uploadingFilesCopy = [...uploadingFiles];

    const newlySelectedFiles: File[] = [];

    try {
      await Promise.all(
        filesToUpload.map(async (originalFile) => {
          const isPdf = originalFile.type === 'application/pdf' || originalFile.name.toLowerCase().endsWith('.pdf');
          if (!isPdf) {
            toast.error(`${originalFile.name} is not a PDF file. Only PDF files are supported.`);
            return;
          }
          const contentType = 'application/pdf';

          // 1. Get pre-signed URL
          const presignedUrlResponse = await fetch(`/api/projects/${projectId}/guidelines/files/s3`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: originalFile.name, contentType }),
          });
          const { url, s3Path, fileId } = await presignedUrlResponse.json();
          if (!url) throw new Error('Failed to get upload URL');

          // Add to visual progress tracker
          const uploadingFile = {
            file: {
              fileName: originalFile.name, fileType: contentType, fileSize: originalFile.size,
              fileUrl: '', s3Path, uploadedAt: new Date().toISOString(),
              uploadedBy: { _id: session?.user.id || '', name: session?.user.name || '', email: session?.user.email || '' },
            }, progress: 0,
          };
          uploadingFilesCopy.push(uploadingFile);
          setUploadingFiles([...uploadingFilesCopy]);

          // 2. Upload to S3
          const fileBlob = new Blob([originalFile], { type: contentType });
          const uploadResponse = await fetch(url, { method: 'PUT', body: fileBlob, headers: { 'Content-Type': contentType } });
          if (!uploadResponse.ok) throw new Error('File upload failed');

          // 3. Get final S3 URL (assuming server generates it based on s3Path)
          const s3UrlResponse = await fetch(`/api/projects/${projectId}/guidelines/files/s3?s3Path=${encodeURIComponent(s3Path)}`);
          const s3UrlData = await s3UrlResponse.json();
          if (!s3UrlData.success) throw new Error('Failed to generate S3 URL');
          const fileUrl = s3UrlData.fileUrl;

          // 4. Register file with our API
          const registerResponse = await fetch(`/api/projects/${projectId}/guidelines/files`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName: originalFile.name, fileType: contentType, fileSize: originalFile.size, fileUrl, s3Path }),
          });
          const registeredFile = await registerResponse.json();
          if (!registeredFile.success) throw new Error('Failed to register file');

          // Update visual progress
          const fileIndex = uploadingFilesCopy.findIndex(f => f.file.s3Path === s3Path);
          if (fileIndex !== -1) {
            uploadingFilesCopy[fileIndex].progress = 100;
            setUploadingFiles([...uploadingFilesCopy]);
          }

          // Create file object for selection state (and potential message sending)
          const newFile: File = {
            fileName: originalFile.name, fileType: contentType, fileSize: originalFile.size,
            fileUrl, s3Path,
            uploadedAt: registeredFile.file?.uploadedAt || new Date().toISOString(),
            uploadedBy: registeredFile.file?.uploadedBy || { _id: session?.user.id || '', name: session?.user.name || '', email: session?.user.email || '' },
            originalFile,
          };

          newlySelectedFiles.push(newFile);
          setFiles(prev => [...prev, newFile]);

          toast.success(`${originalFile.name} uploaded successfully`);
        })
      );

      // Add all successfully uploaded files from this batch to the selectedFiles state
      setSelectedFiles((prev) => [...prev, ...newlySelectedFiles]);

    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Failed to upload one or more file(s)');
    } finally {
      setUploading(false);
      setUploadingFiles([]);
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
        title={!isAiConfigured ? 'Configure AI assistant to attach files' : 'Attach PDF file'}
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

  // Main Component Return
  return (
    <Card className='w-full'>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className='text-2xl'>Project Guidelines Assistant</CardTitle>
          <p className="text-muted-foreground text-sm mt-1">Ask questions about guidelines using your preferred AI model</p>
        </div>
        <div className='flex gap-2'>
          {/* AI Settings Button */}
          <Button
            size='sm'
            variant='outline'
            onClick={() => setAiModalOpen(true)}
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
                  To get started with project guidelines, configure an AI assistant that will help manage conversations and answer questions about this project.
                </p>
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
                          {/* Attachments */}
                          {message.attachments && message.attachments.length > 0 && (
                            <div className='mt-2 space-y-1'>
                              {message.attachments.map((attachment, index) => (
                                <a key={index} href={attachment.fileUrl} target='_blank' rel='noopener noreferrer' className='flex items-center text-xs text-blue-600 dark:text-blue-400 hover:underline'>
                                  {getFileIcon(attachment.fileType)}
                                  <span className='ml-1 truncate'>{attachment.fileName}</span>
                                </a>
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

      {/* Knowledge Files Sidebar - Replaced Dialog with Sidebar */}
      <KnowledgeSidebar 
        isOpen={knowledgeSidebarOpen}
        onClose={() => setKnowledgeSidebarOpen(false)}
        files={files}
        fileInputRef={fileInputRef}
        showIframe={showIframe}
        setShowIframe={setShowIframe}
        handleConnect={handleConnect}
        handleBackFromIframe={handleBackFromIframe}
      />

      {/* AI Configuration Dialog */}
      <Dialog open={aiModalOpen} onOpenChange={setAiModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isAiConfigured ? 'AI Assistant Settings' : 'Configure AI Assistant'}</DialogTitle>
            <DialogDescription>
              {isAiConfigured ? 'Select or update the AI model for this project' : 'Set up an AI assistant to help with project discussions'}
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <AIModelSelector onSelect={setAiConfig} isLoading={isGeneratingAI} />
             {savedAiConfig && (
               <div className="text-sm text-muted-foreground mt-2">
                  Currently using: {savedAiConfig.modelName || `${savedAiConfig.provider} - ${savedAiConfig.model}`}
               </div>
             )}
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setAiModalOpen(false)}>Cancel</Button>
            <Button
              onClick={configureAndTrainAI}
              disabled={isGeneratingAI || !aiConfig.provider || !aiConfig.model || !aiConfig.apiKey}
            >
              {isGeneratingAI ? (
                <><Loader2 className='h-4 w-4 mr-2 animate-spin' /> {isAiConfigured ? 'Updating...' : 'Setting up AI...'}</>
              ) : (isAiConfigured ? 'Update AI Assistant' : 'Configure & Start AI')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add overlay when sidebar is open for small screens */}
      {knowledgeSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-40 lg:hidden" 
          onClick={() => setKnowledgeSidebarOpen(false)}
        />
      )}
    </Card>
  );
};

export default ProjectGuidelines;