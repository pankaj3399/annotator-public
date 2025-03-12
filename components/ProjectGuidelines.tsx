'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { generateAIResponseWithAttachments } from '@/app/actions/aiModel';

interface FileAttachment {
  fileName: string;
  fileType: string;
  content: string | ArrayBuffer | null;
  fileUrl?: string;
  s3Path?: string;
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
}

const ProjectGuidelines = () => {
  const { data: session } = useSession();
  const params = useParams();
  const projectId = params.projectId as string;

  // Project data states
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [editingDescription, setEditingDescription] = useState(false);
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
  const [isAiTrainingComplete, setIsAiTrainingComplete] = useState(false);
  const [showAiSetupPrompt, setShowAiSetupPrompt] = useState(true);
  const [savedAiConfig, setSavedAiConfig] = useState<AIConfig | null>(null);

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
    const aiMessages = messages.filter((msg) => msg.isAiMessage);

    // If there are ANY messages (AI or user), don't show the setup prompt
    if (messages.length > 0) {
      setShowAiSetupPrompt(false);
    }

    // Only set AI as configured if we have AI messages or saved config
    if (aiMessages.length > 0) {
      setIsAiConfigured(true);
      setIsAiTrainingComplete(true);
    }

    // Fetch saved AI config if available
    const fetchAiConfig = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/ai-config`);

        // If the endpoint doesn't exist (404) or other error occurs
        if (!res.ok) {
          console.log(`API endpoint returned ${res.status}: ${res.statusText}`);

          // Try to load from localStorage instead
          try {
            const savedConfig = localStorage.getItem(
              `project_${projectId}_ai_config`
            );
            if (savedConfig) {
              const parsedConfig = JSON.parse(savedConfig);
              setSavedAiConfig(parsedConfig);
              setAiConfig(parsedConfig);

              if (
                parsedConfig.provider &&
                parsedConfig.model &&
                parsedConfig.apiKey
              ) {
                setIsAiConfigured(true);
              }
            }
          } catch (localStorageError) {
            console.log('Could not load from localStorage:', localStorageError);
          }

          return; // Exit without further processing
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
        // Silently handle the error - the API endpoint might not exist yet
        console.log(
          'Error fetching AI config (may be a missing endpoint):',
          error
        );

        // Try to load from localStorage instead
        try {
          const savedConfig = localStorage.getItem(
            `project_${projectId}_ai_config`
          );
          if (savedConfig) {
            const parsedConfig = JSON.parse(savedConfig);
            setSavedAiConfig(parsedConfig);
            setAiConfig(parsedConfig);

            if (
              parsedConfig.provider &&
              parsedConfig.model &&
              parsedConfig.apiKey
            ) {
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
        setDescription(data.description || '');
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

  const updateDescription = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/guidelines`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Description updated successfully');
        setEditingDescription(false);
      } else {
        toast.error(data.error || 'Failed to update description');
      }
    } catch (error) {
      console.error('Error updating description:', error);
      toast.error('An error occurred while updating the description');
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !selectedFiles.length) return;

    try {
      // Prepare file attachments with proper file URLs for the UI message
      const attachments = selectedFiles.map((file) => ({
        fileName: file.fileName,
        fileType: file.fileType,
        fileSize: file.fileSize,
        fileUrl: file.fileUrl,
        s3Path: file.s3Path,
      }));

      // First send the user's message
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
        // Optimistically add the message to the UI
        const optimisticMessage = {
          ...data.message,
          sender: {
            _id: session?.user.id || '',
            name: session?.user.name || '',
            email: session?.user.email || '',
          },
        };

        setMessages((prev) => [...prev, optimisticMessage]);

        // Only after the user message is sent and displayed, process AI response
        if (isAiConfigured && aiConfig.apiKey) {
          // Process PDFs for AI
          const aiAttachments = await Promise.all(
            selectedFiles.map(async (file) => {
              const originalFile = file.originalFile;
              let fileContent = null;

              // For PDF files, try to read content as data URL
              if (originalFile) {
                try {
                  // Read PDF as a data URL (base64)
                  fileContent = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target?.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(originalFile);
                  });
                  console.log(
                    `Successfully read content for PDF: ${file.fileName}`
                  );
                } catch (error) {
                  console.error(
                    `Error reading PDF content for ${file.fileName}:`,
                    error
                  );
                  // Continue with s3Path as fallback
                }
              }

              // Create attachment object with all necessary info for AI
              return {
                fileName: file.fileName,
                fileType: file.fileType,
                content: fileContent, // Direct content if available
                fileUrl: file.fileUrl, // URL for server-side access
                s3Path: file.s3Path, // S3 path for server-side retrieval
              };
            })
          );

          // Send message with prepared attachments to AI
          await generateAIResponse(
            newMessage || `I've uploaded ${selectedFiles.length} PDF file(s)`,
            aiAttachments
          );
        } else if (!isAiConfigured) {
          // If AI is not configured, show a reminder toast
          toast.info('Configure AI assistant to get automated responses', {
            action: {
              label: 'Configure',
              onClick: () => setAiModalOpen(true),
            },
          });
        }

        // Clear inputs after processing
        setNewMessage('');
        setSelectedFiles([]);

        // Refetch to get the latest data
        await fetchGuidelines();
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
      // Create a prompt using context from the conversation
      const conversationContext = messages
        .map((msg) => `${msg.sender.name}: ${msg.content}`)
        .join('\n');

      const prompt = `
        Project Name: ${projectName}
        Project Description: ${description}
        
        Recent Conversation:
        ${conversationContext}
        
        User's message: ${userMessage}
        
        Please provide a helpful, professional response as the AI assistant for this project. If PDF files are attached, analyze their content and provide relevant insights.
      `;

      // Use the additionalAttachments which already contain PDF content
      const attachments = additionalAttachments || [];

      console.log(
        `Sending ${attachments.length} PDF attachments to AI service`
      );
      if (attachments.length > 0) {
        console.log(
          'PDF attachments have content:',
          attachments.map((a) => (a.content ? 'Yes' : 'No')).join(', ')
        );
        console.log(
          'PDF attachments have s3Path:',
          attachments.map((a) => (a.s3Path ? 'Yes' : 'No')).join(', ')
        );
      }

      // Send to AI service
      const response = await generateAIResponseWithAttachments(
        aiConfig.provider,
        aiConfig.model,
        prompt,
        projectId,
        aiConfig.apiKey,
        attachments.length > 0 ? attachments : undefined
      );

      if (response) {
        // Add AI response to the UI
        const aiResponseMessage = {
          _id: `ai-response-${Date.now()}`,
          sender: {
            _id: 'ai-assistant',
            name: `${aiConfig.provider} Assistant`,
            email: 'ai@assistant.com',
            image: '/ai-assistant-avatar.png',
          },
          content: response,
          timestamp: new Date().toISOString(),
          attachments: selectedFiles,
          isAiMessage: true,
        };

        setMessages((prev) => [...prev, aiResponseMessage]);

        // Save AI message to the server
        await fetch(`/api/projects/${projectId}/guidelines`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: response,
            isAiMessage: true,
            aiProvider: aiConfig.provider,
            aiModel: aiConfig.model,
            attachments: selectedFiles,
          }),
        });

        // Clear selected files after sending
        setSelectedFiles([]);
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
      // Try to save AI configuration, but continue if endpoint doesn't exist
      try {
        const configResponse = await fetch(
          `/api/projects/${projectId}/ai-config`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ config: aiConfig }),
          }
        );

        if (!configResponse.ok) {
          console.log(
            `Warning: Could not save AI config. Status: ${configResponse.status}`
          );
          // Continue anyway - the AI can still work without saving the config
        }
      } catch (configError) {
        console.log(
          'Error saving AI config (endpoint may not exist):',
          configError
        );
        // Continue anyway - failure to save config shouldn't stop the process
      }

      // Store AI config in localStorage as a fallback
      try {
        localStorage.setItem(
          `project_${projectId}_ai_config`,
          JSON.stringify(aiConfig)
        );
      } catch (storageError) {
        console.log('Could not save to localStorage:', storageError);
      }

      // Create a training prompt that includes project information
      const trainingPrompt = `
        Project Name: ${projectName}
        Project Description: ${description || 'No description available.'}
        
        This AI will assist with project guidelines and answering questions related to this project.
        
        The AI should:
        1. Maintain a professional and helpful tone
        2. Reference project details when relevant
        3. Assist with clarifying guidelines or requirements
        4. Help team members understand project context
        
        Please introduce yourself as an AI assistant for this project with a brief, professional message.
      `;

      // Send training prompt to AI
      const response = await generateAIResponseWithAttachments(
        aiConfig.provider,
        aiConfig.model,
        trainingPrompt,
        projectId,
        aiConfig.apiKey
      );

      if (response) {
        // Add AI's introduction as first message
        const aiMessage = {
          _id: `ai-intro-${Date.now()}`,
          sender: {
            _id: 'ai-assistant',
            name: `${aiConfig.provider} Assistant`,
            email: 'ai@assistant.com',
            image: '/ai-assistant-avatar.png', // Add a default AI avatar
          },
          content: response,
          timestamp: new Date().toISOString(),
          attachments: [],
          isAiMessage: true,
        };

        setMessages((prev) => [...prev, aiMessage]);
        setIsAiConfigured(true);
        setIsAiTrainingComplete(true);
        setShowAiSetupPrompt(false);

        // Also save this message to the server
        await fetch(`/api/projects/${projectId}/guidelines`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
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

    try {
      await Promise.all(
        filesToUpload.map(async (originalFile) => {
          // Check if file is a PDF
          const isPdf =
            originalFile.type === 'application/pdf' ||
            originalFile.name.toLowerCase().endsWith('.pdf');

          if (!isPdf) {
            toast.error(
              `${originalFile.name} is not a PDF file. Only PDF files are supported.`
            );
            return; // Skip non-PDF files
          }

          // Set content type to PDF
          const contentType = 'application/pdf';

          console.log(`Uploading PDF file: ${originalFile.name}`);

          // Step 1: Get pre-signed URL from project-specific guideline route
          const presignedUrlResponse = await fetch(
            `/api/projects/${projectId}/guidelines/files/s3`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                filename: originalFile.name,
                contentType: contentType,
              }),
            }
          );

          const { url, s3Path, fileId } = await presignedUrlResponse.json();

          if (!url) {
            throw new Error('Failed to get upload URL');
          }

          // Create a blob with PDF content type
          const fileBlob = new Blob([originalFile], {
            type: contentType,
          });

          // Add file to uploading list
          const uploadingFile = {
            file: {
              fileName: originalFile.name,
              fileType: contentType,
              fileSize: originalFile.size,
              fileUrl: '', // Will be updated after successful upload
              s3Path,
              uploadedAt: new Date().toISOString(),
              uploadedBy: {
                _id: session?.user.id || '',
                name: session?.user.name || '',
                email: session?.user.email || '',
              },
            },
            progress: 0,
          };

          uploadingFilesCopy.push(uploadingFile);
          setUploadingFiles([...uploadingFilesCopy]);

          // Step 2: Upload file to pre-signed URL
          const uploadResponse = await fetch(url, {
            method: 'PUT',
            body: fileBlob,
            headers: {
              'Content-Type': contentType,
            },
          });

          if (!uploadResponse.ok) {
            throw new Error('File upload failed');
          }

          // Step 3: Get proper S3 URL from our project-specific API route
          const s3UrlResponse = await fetch(
            `/api/projects/${projectId}/guidelines/files/s3?s3Path=${encodeURIComponent(s3Path)}`
          );
          const s3UrlData = await s3UrlResponse.json();

          if (!s3UrlData.success) {
            throw new Error('Failed to generate S3 URL');
          }

          const fileUrl = s3UrlData.fileUrl;

          // Step 4: Register the file with our API
          const registerResponse = await fetch(
            `/api/projects/${projectId}/guidelines/files`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                fileName: originalFile.name,
                fileType: contentType,
                fileSize: originalFile.size,
                fileUrl,
                s3Path,
              }),
            }
          );

          const registeredFile = await registerResponse.json();

          if (!registeredFile.success) {
            throw new Error('Failed to register file');
          }

          // Update uploading progress
          const fileIndex = uploadingFilesCopy.findIndex(
            (f) => f.file.s3Path === s3Path
          );
          if (fileIndex !== -1) {
            uploadingFilesCopy[fileIndex].progress = 100;
            setUploadingFiles([...uploadingFilesCopy]);
          }

          // Create a new file object with the originalFile reference for content extraction
          const newFile = {
            fileName: originalFile.name,
            fileType: contentType,
            fileSize: originalFile.size,
            fileUrl,
            s3Path,
            uploadedAt: new Date().toISOString(),
            uploadedBy: {
              _id: session?.user.id || '',
              name: session?.user.name || '',
              email: session?.user.email || '',
            },
            originalFile, // Keep reference to the original file for content extraction later
          };

          // Add file to selected files for the message
          setSelectedFiles((prev) => [...prev, newFile as File]);

          toast.success(`${originalFile.name} uploaded successfully`);
        })
      );
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Failed to upload file(s)');
    } finally {
      setUploading(false);
      setUploadingFiles([]);
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Image className='h-4 w-4' />;
    }
    return <FileText className='h-4 w-4' />;
  };

  if (loading) {
    return (
      <Card className='w-full'>
        <CardContent className='p-6 flex justify-center items-center h-64'>
          <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
        </CardContent>
      </Card>
    );
  }
  const FileInput = () => (
    <>
      <Button
        type='button'
        size='icon'
        variant='ghost'
        className='rounded-full'
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading || !isAiConfigured}
        title={
          !isAiConfigured
            ? 'Configure AI assistant to send messages'
            : 'Attach PDF file'
        }
      >
        <PaperclipIcon
          className={`h-5 w-5 ${!isAiConfigured ? 'opacity-50' : ''}`}
        />
        <span className='sr-only'>Attach PDF</span>
      </Button>
      <input
        type='file'
        ref={fileInputRef}
        className='hidden'
        accept='.pdf,application/pdf'
        multiple
        onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
      />
    </>
  );
  return (
    <Card className='w-full'>
      <CardHeader>
        <CardTitle className='flex justify-between items-center'>
          <span>Project Guidelines</span>
          <div className='flex gap-2'>
            {isAiConfigured && (
              <Button
                size='sm'
                variant='outline'
                onClick={() => setAiModalOpen(true)}
              >
                <Settings className='h-4 w-4 mr-2' />
                AI Settings
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className='p-6'>
        <Tabs defaultValue='chat'>
          <TabsList className='grid w-full grid-cols-2 mb-4'>
            <TabsTrigger value='chat'>Chat & Guidelines</TabsTrigger>
            <TabsTrigger value='files'>Files ({files.length})</TabsTrigger>
          </TabsList>

          <TabsContent value='chat' className='space-y-4'>
            {/* Project Description */}
            <Card>
              <CardHeader className='py-3 px-4'>
                <CardTitle className='text-sm flex justify-between items-center'>
                  <span>Project Description</span>
                  {editingDescription ? (
                    <div className='flex space-x-2'>
                      <Button
                        size='sm'
                        variant='outline'
                        onClick={() => setEditingDescription(false)}
                      >
                        Cancel
                      </Button>
                      <Button size='sm' onClick={updateDescription}>
                        Save
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() => setEditingDescription(true)}
                    >
                      Edit
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className='px-4 py-2'>
                {editingDescription ? (
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder='Enter project description and guidelines...'
                    className='min-h-[120px]'
                  />
                ) : (
                  <div className='text-sm'>
                    {description ? (
                      <div
                        dangerouslySetInnerHTML={{
                          __html: description.replace(/\n/g, '<br />'),
                        }}
                      />
                    ) : (
                      <p className='text-muted-foreground italic'>
                        No description provided. Click edit to add project
                        description and guidelines.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Messages */}
            <div className='bg-muted/40 rounded-lg border'>
              {!isAiConfigured && showAiSetupPrompt && messages.length === 0 ? (
                <div className='flex flex-col items-center justify-center h-[400px] text-center px-4'>
                  <Bot className='h-16 w-16 mb-4 opacity-60' />
                  <h3 className='text-xl font-medium mb-2'>
                    Configure AI Assistant
                  </h3>
                  <p className='text-muted-foreground max-w-md mb-6'>
                    To get started with project guidelines, configure an AI
                    assistant that will help manage conversations and answer
                    questions about this project.
                  </p>
                  <Dialog open={aiModalOpen} onOpenChange={setAiModalOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Bot className='h-4 w-4 mr-2' />
                        Setup AI Assistant
                      </Button>
                    </DialogTrigger>
                  </Dialog>
                </div>
              ) : (
                <ScrollArea className='h-[400px] px-4 pt-4'>
                  {messages.length === 0 ? (
                    <div className='flex flex-col items-center justify-center h-[320px] text-center text-muted-foreground'>
                      <FileText className='h-8 w-8 mb-2 opacity-50' />
                      <h3 className='font-medium'>No messages yet</h3>
                      <p className='text-sm'>
                        Start a conversation about project guidelines
                      </p>
                      {!isAiConfigured && (
                        <Button
                          className='mt-4'
                          variant='outline'
                          size='sm'
                          onClick={() => setAiModalOpen(true)}
                        >
                          <Bot className='h-4 w-4 mr-2' />
                          Setup AI Assistant
                        </Button>
                      )}
                    </div>
                  ) : (
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
                          {/* Show avatar for AI or other users (not current user) */}
                          {(message.isAiMessage ||
                            message.sender._id !== session?.user.id) && (
                            <div className='flex-shrink-0 mr-2'>
                              <Avatar className='h-8 w-8'>
                                {message.isAiMessage ? (
                                  <AvatarImage
                                    src='/ai-assistant-avatar.png'
                                    alt='AI'
                                  />
                                ) : (
                                  <AvatarImage
                                    src={message.sender.image}
                                    alt={message.sender.name}
                                  />
                                )}
                                <AvatarFallback>
                                  {message.isAiMessage
                                    ? 'AI'
                                    : message.sender.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                          )}

                          {/* Message bubble with content */}
                          <div
                            className={`max-w-[80%] ${
                              message.isAiMessage
                                ? 'bg-blue-100 dark:bg-blue-950'
                                : message.sender._id === session?.user.id
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                            } rounded-lg p-3`}
                          >
                            {/* Show sender name for other users (not AI, not current user) */}
                            {!message.isAiMessage &&
                              message.sender._id !== session?.user.id && (
                                <div className='font-semibold text-xs mb-1'>
                                  {message.sender.name}
                                </div>
                              )}

                            {/* Show AI label for AI messages */}
                            {message.isAiMessage && (
                              <div className='font-semibold text-xs mb-1 flex items-center'>
                                <Bot className='h-3 w-3 mr-1' />
                                {message.sender.name}
                              </div>
                            )}

                            {/* Message content */}
                            <div className='whitespace-pre-wrap'>
                              {message.content}
                            </div>

                            {/* Attachments */}
                            {message.attachments &&
                              message.attachments.length > 0 && (
                                <div className='mt-2 space-y-1'>
                                  {message.attachments.map(
                                    (attachment, index) => (
                                      <a
                                        key={index}
                                        href={attachment.fileUrl}
                                        target='_blank'
                                        rel='noopener noreferrer'
                                        className='flex items-center text-xs text-blue-600 dark:text-blue-400 hover:underline'
                                      >
                                        {getFileIcon(attachment.fileType)}
                                        <span className='ml-1 truncate'>
                                          {attachment.fileName}
                                        </span>
                                      </a>
                                    )
                                  )}
                                </div>
                              )}

                            {/* Timestamp */}
                            <div className='text-xs text-right mt-1 opacity-70'>
                              {formatDistanceToNow(
                                new Date(message.timestamp),
                                {
                                  addSuffix: true,
                                }
                              )}
                            </div>
                          </div>

                          {/* Current user avatar (right side) */}
                          {!message.isAiMessage &&
                            message.sender._id === session?.user.id && (
                              <div className='flex-shrink-0 ml-2'>
                                <Avatar className='h-8 w-8'>
                                  <AvatarImage alt={session?.user.name || ''} />
                                  <AvatarFallback>
                                    {session?.user.name?.charAt(0) || 'U'}
                                  </AvatarFallback>
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

              {/* Selected files preview */}
              {selectedFiles.length > 0 && (
                <div className='px-4 py-2'>
                  <div className='text-xs font-medium mb-2'>
                    Selected Files:
                  </div>
                  <div className='flex flex-wrap gap-2'>
                    {selectedFiles.map((file, index) => (
                      <div
                        key={index}
                        className='flex items-center bg-muted rounded-full pl-2 pr-1 py-1 text-xs'
                      >
                        {file.fileType.startsWith('image/') ? (
                          <Image className='h-3 w-3 mr-1' />
                        ) : (
                          <FileText className='h-3 w-3 mr-1' />
                        )}
                        <span className='max-w-[150px] truncate mr-1'>
                          {file.fileName}
                        </span>
                        <Button
                          type='button'
                          variant='ghost'
                          size='icon'
                          className='h-4 w-4 rounded-full hover:bg-muted-foreground/20'
                          onClick={() => removeSelectedFile(index)}
                        >
                          <X className='h-3 w-3' />
                          <span className='sr-only'>Remove</span>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Uploading files progress */}
              {uploadingFiles.length > 0 && (
                <div className='px-4 py-2'>
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
                        <div className='flex-1 truncate'>
                          {uploadingFile.file.fileName}
                        </div>
                        <div className='ml-2'>{uploadingFile.progress}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Message input - only show if AI is configured or messages exist */}
              {(isAiConfigured || messages.length > 0) && (
                <div className='p-3 border-t flex gap-2'>
                  <FileInput />
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder={
                      isAiConfigured
                        ? 'Type a message...'
                        : 'Configure AI assistant to send messages'
                    }
                    className='min-h-[40px] resize-none'
                    disabled={!isAiConfigured}
                  />
                  <Button
                    type='button'
                    size='icon'
                    onClick={
                      !isAiConfigured
                        ? () => setAiModalOpen(true)
                        : handleSendMessage
                    }
                    disabled={
                      !isAiConfigured
                        ? false
                        : (newMessage.trim() === '' &&
                            selectedFiles.length === 0) ||
                          uploading ||
                          isGeneratingAI
                    }
                  >
                    {uploading || isGeneratingAI ? (
                      <Loader2 className='h-5 w-5 animate-spin' />
                    ) : !isAiConfigured ? (
                      <Bot className='h-5 w-5' />
                    ) : (
                      <Send className='h-5 w-5' />
                    )}
                    <span className='sr-only'>
                      {!isAiConfigured ? 'Configure AI' : 'Send'}
                    </span>
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value='files' className='space-y-4'>
            <Card>
              <CardContent className='p-4'>
                {files.length === 0 ? (
                  <div className='flex flex-col items-center justify-center h-64 text-center text-muted-foreground'>
                    <FileText className='h-8 w-8 mb-2 opacity-50' />
                    <h3 className='font-medium'>No files uploaded yet</h3>
                    <p className='text-sm'>
                      Upload files in the chat to share project materials
                    </p>
                  </div>
                ) : (
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    {files.map((file, index) => (
                      <div
                        key={index}
                        className='border rounded-lg p-3 flex items-start gap-3'
                      >
                        {file.fileType.startsWith('image/') ? (
                          <div className='w-12 h-12 bg-muted rounded flex items-center justify-center'>
                            <Image className='h-6 w-6 text-foreground/70' />
                          </div>
                        ) : (
                          <div className='w-12 h-12 bg-muted rounded flex items-center justify-center'>
                            <FileText className='h-6 w-6 text-foreground/70' />
                          </div>
                        )}
                        <div className='flex-1 min-w-0'>
                          <div className='flex items-center justify-between gap-2'>
                            <div className='font-medium truncate'>
                              {file.fileName}
                            </div>
                            <a
                              href={file.fileUrl}
                              target='_blank'
                              rel='noopener noreferrer'
                              className='text-xs text-blue-600 dark:text-blue-400 whitespace-nowrap'
                            >
                              Download
                            </a>
                          </div>
                          <div className='text-xs text-muted-foreground mt-1'>
                            Uploaded{' '}
                            {formatDistanceToNow(new Date(file.uploadedAt), {
                              addSuffix: true,
                            })}{' '}
                            by {file.uploadedBy.name}
                          </div>
                          {file.fileType.startsWith('image/') && (
                            <a
                              href={file.fileUrl}
                              target='_blank'
                              rel='noopener noreferrer'
                              className='block mt-2'
                            >
                              <img
                                src={file.fileUrl}
                                alt={file.fileName}
                                className='max-h-32 max-w-full rounded border'
                              />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* AI Configuration Dialog - accessible from settings button */}
      <Dialog open={aiModalOpen} onOpenChange={setAiModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isAiConfigured
                ? 'AI Assistant Settings'
                : 'Configure AI Assistant'}
            </DialogTitle>
            <DialogDescription>
              {isAiConfigured
                ? 'Update your AI assistant configuration'
                : 'Set up an AI assistant to help with project discussions'}
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-4'>
          <div className='space-y-2'>
  <label className='text-sm font-medium'>AI Provider <span className="text-red-500">*</span></label>
  <select
    className='w-full p-2 border rounded'
    value={aiConfig.provider}
    onChange={(e) =>
      setAiConfig({
        ...aiConfig,
        provider: e.target.value,
        model: '', // Reset model when provider changes
      })
    }
    required
  >
    <option value=''>Choose AI Provider</option>
    <option value='OpenAI'>OpenAI</option>
    <option value='Anthropic'>Anthropic</option>
    <option value='Gemini'>Gemini</option>
  </select>
</div>
<div className='space-y-2'>
  <label className='text-sm font-medium'>Model <span className="text-red-500">*</span></label>
  <select
    className='w-full p-2 border rounded'
    value={aiConfig.model}
    onChange={(e) =>
      setAiConfig({ ...aiConfig, model: e.target.value })
    }
    required
    disabled={!aiConfig.provider}
  >
    <option value=''>Choose AI Model</option>
    {aiConfig.provider === 'OpenAI' && (
      <>
        <option value='gpt-4'>GPT-4</option>
        <option value='gpt-4-turbo'>GPT-4 Turbo</option>
        <option value='gpt-4o'>GPT-4o</option>
        <option value='gpt-4o-mini'>GPT-4o Mini</option>
        <option value='gpt-3.5-turbo'>GPT-3.5 Turbo</option>
      </>
    )}
    {aiConfig.provider === 'Anthropic' && (
      <>
        <option value='claude-3-5-sonnet-latest'>
          Claude 3.5 Sonnet Latest
        </option>
        <option value='claude-3-5-sonnet-20240620'>
          Claude 3.5 Sonnet 20240620
        </option>
        <option value='claude-3-haiku-20240307'>
          Claude 3 Haiku 20240307
        </option>
        <option value='claude-3-opus-latest'>
          Claude 3 Opus Latest
        </option>
        <option value='claude-3-opus-20240229'>
          Claude 3 Opus 20240229
        </option>
      </>
    )}
    {aiConfig.provider === 'Gemini' && (
      <>
        <option value='gemini-1.0-pro'>Gemini 1.0 Pro</option>
        <option value='gemini-1.5-flash'>Gemini 1.5 Flash</option>
        <option value='gemini-1.5-pro'>Gemini 1.5 Pro</option>
        <option value='gemini-pro'>Gemini Pro</option>
      </>
    )}
  </select>
</div>
            <div className='space-y-2'>
              <label className='text-sm font-medium'>API Key</label>
              <Input
                type='password'
                placeholder='Enter API key'
                value={aiConfig.apiKey}
                onChange={(e) =>
                  setAiConfig({ ...aiConfig, apiKey: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setAiModalOpen(false)}>
              Cancel
            </Button>
            <Button
  onClick={configureAndTrainAI}
  disabled={
    isGeneratingAI ||
    !aiConfig.provider ||
    !aiConfig.model ||
    !aiConfig.apiKey
  }
>
  {isGeneratingAI ? (
    <>
      <Loader2 className='h-4 w-4 mr-2 animate-spin' />
      {isAiConfigured ? 'Updating...' : 'Setting up AI...'}
    </>
  ) : isAiConfigured ? (
    'Update AI Assistant'
  ) : (
    'Configure & Train AI'
  )}
</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ProjectGuidelines;
