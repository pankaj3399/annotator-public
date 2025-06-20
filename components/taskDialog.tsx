'use client';

import {
  createRepeatTask,
  createTasks,
  saveRepeatTasks,
} from '@/app/actions/task';
import { Project } from '@/app/(maneger)/page';
import { template } from '@/app/template/page';
import { Button } from '@/components/ui/button';
import { getTemplate } from '@/app/actions/template';
import { getAllAnnotators } from '@/app/actions/annotator';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { ArrowRight, Minus, Plus, Settings, Upload, Filter } from 'lucide-react';
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { updateTestTemplate } from '@/app/actions/template';
import Papa from 'papaparse';
import { CarouselContent } from './ui/carousel';
import AIConfigModal from './AiModal';
import MultiAIModal from './MultiAiModal';
import { generateAiResponse } from '@/app/actions/aiModel';
import { usePathname } from 'next/navigation';
import CloudStorageFileBrowser from './GoogleDriveOrS3UploadFileButton';
import MultiCombobox from '@/components/ui/multi-combobox';
import { domains, languages, locations } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';

interface TaskValue {
  content: string;
  fileType?: 'image' | 'video' | 'document' | 'audio';
}

interface CarouselContent {
  slides: Array<{
    type: string;
    src?: string;
    innerText?: string;
  }>;
  keyboardNav?: boolean;
  autoSlide?: boolean;
  slideInterval?: number;
  currentSlideIndex?: number;
}

export interface Task {
  id: number;
  values: {
    [key: string]: TaskValue | CarouselContent;
  };
}

export interface Placeholder {
  type: 'text' | 'video' | 'img' | 'audio' | 'upload' | 'carousel';
  index: number;
  name: string;
}

interface FilledTask {
  project: string;
  name: string;
  content: string;
  timer: number;
  annotator?: string;
  reviewer: string;
  type: string;
  template: string;
}

export interface RepeatTask {
  project: string;
  name: string;
  content: string;
  timer: number;
  annotator?: string | null;
  reviewer: string;
  template: string;
  type: string;
}

export interface Annotator {
  _id: string;
  name: string;
  email: string;
  lastLogin: string;
  permission?: string[];
  domain?: string[];
  lang?: string[];
  location?: string;
}

interface CreateTasksResponse {
  success: boolean;
  tasks: {
    _id: string;
    annotator?: string;
    [key: string]: any;
  }[];
}

interface SaveTasksResponse {
  success: boolean;
  tasks: {
    _id: string;
    annotator?: string;
    [key: string]: any;
  }[];
}

interface Model {
  _id: string;
  user: string;
  projectid: string;
  name: string;
  apiKey: string;
  provider: string;
  enabled: boolean;
  model: string;
}

interface StorageConnection {
  _id: string;
  storageType: 's3' | 'googleDrive';
  isActive: boolean;
  lastUsed: string | null;
  created_at: string;
  s3Config?: {
    bucketName: string;
    region: string;
    folderPrefix?: string;
  };
  googleDriveConfig?: {
    displayName: string;
    email: string;
  };
}

interface Option {
  value: string;
  label: string;
}

// Filter options based on your constants
const domainOptions: Option[] = domains.map((d) => ({
  value: d.toLowerCase(),
  label: d,
}));

const languageOptions: Option[] = languages.map((l) => ({
  value: l.toLowerCase(),
  label: l,
}));

const locationOptions: Option[] = locations.map((l) => ({
  value: l.toLowerCase(),
  label: l.charAt(0).toUpperCase() + l.slice(1),
}));

export function TaskDialog({
  onConfigure,
  aiModels,
  template,
  isDialogOpen,
  setIsDialogOpen,
  project,
  handleAssignUser,
}: {
  onConfigure: (projectId: string) => Promise<any>;
  aiModels: Model[] | undefined;
  template: template & { _id: string; testTemplate?: boolean };
  isDialogOpen: boolean;
  setIsDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  project: Project;
  handleAssignUser: (
    annotatorId: string,
    taskId: string,
    ai: boolean
  ) => Promise<any>;
}) {
  const [provider, setProvider] = useState('');
  const [placeholders, setPlaceholders] = useState<Placeholder[]>([]);
  const [tasks, setTasks] = useState<Task[]>([{ id: 1, values: {} }]);
  const [globalRepeat, setGlobalRepeat] = useState(1);
  const [assignToAllAnnotators, setAssignToAllAnnotators] = useState(
    template.testTemplate || false
  );
  const [annotators, setAnnotators] = useState<Annotator[]>([]);
  
  // NEW: Filter states for annotators
  const [selectedDomain, setSelectedDomain] = useState<string[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const [systemPrompt, setSystemPrompt] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [generateAi, setGenerateAi] = useState(false);
  const [selectedModel, setSelectedModel] = useState('');
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [currentPlaceholder, setCurrentPlaceholder] =
    useState<Placeholder | null>(null);
  const [isGeneratingForAll, setIsGeneratingForAll] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isMultiAiModalOpen, setIsMultiAiModalOpen] = useState(false);
  const [selectedPlaceholder, setSelectedPlaceholder] = useState<any>({});
  const [numberOfTasks, setNumberOfTasks] = useState(tasks.length);
  const [aiResponse, setAiResponse] = useState<any>([]);
  const [connections, setConnections] = useState<StorageConnection[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // NEW: Filtered annotators based on selected filters
  const filteredAnnotators = useMemo(() => {
    return annotators.filter((annotator) => {
      // Domain filter
      const userDomainsLower = annotator.domain?.map((d) => d?.toLowerCase() ?? '') || [];
      const matchesDomain =
        selectedDomain.length === 0 ||
        selectedDomain.some((selected) =>
          userDomainsLower.includes(selected.toLowerCase())
        );

      // Language filter
      const userLangsLower = annotator.lang?.map((l) => l?.toLowerCase() ?? '') || [];
      const matchesLanguage =
        selectedLanguage.length === 0 ||
        selectedLanguage.some((selected) =>
          userLangsLower.includes(selected.toLowerCase())
        );

      // Location filter
      const userLocationLower = annotator.location?.toLowerCase() || '';
      const matchesLocation =
        selectedLocation.length === 0 ||
        selectedLocation.some(
          (selected) => userLocationLower === selected.toLowerCase()
        );

      return matchesDomain && matchesLanguage && matchesLocation;
    });
  }, [annotators, selectedDomain, selectedLanguage, selectedLocation]);

  // Update global repeat when filtered annotators change
  useEffect(() => {
    if (assignToAllAnnotators) {
      setGlobalRepeat(filteredAnnotators.length);
    }
  }, [assignToAllAnnotators, filteredAnnotators.length]);

  useEffect(() => {
    if (isDialogOpen) {
      fetchCurrentTemplateState();
      fetchAnnotators();
      fetchStorageConnections();
    }
  }, [isDialogOpen]);

  const pathName = usePathname();
  const projectId = pathName.split('/')[2];

  const fetchAnnotators = useCallback(async () => {
    try {
      const annotatorsData = JSON.parse(
        await getAllAnnotators()
      ) as Annotator[];
      setAnnotators(annotatorsData);
      if (assignToAllAnnotators) {
        setGlobalRepeat(annotatorsData.length);
      }
    } catch (error) {
      console.error('Error fetching annotators:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch annotators',
        variant: 'destructive',
      });
    }
  }, [assignToAllAnnotators]);

  const fetchCurrentTemplateState = useCallback(async () => {
    try {
      const templateData = await getTemplate(template._id);
      const currentTemplate = JSON.parse(templateData);
      setAssignToAllAnnotators(currentTemplate.testTemplate || false);

      if (currentTemplate.testTemplate && annotators.length > 0) {
        setGlobalRepeat(annotators.length);
      } else {
        setGlobalRepeat(1);
      }
    } catch (error) {
      console.error('Error fetching template state:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch template settings',
        variant: 'destructive',
      });
    }
  }, [template._id, annotators.length]);

  const fetchStorageConnections = useCallback(async () => {
    try {
      const response = await fetch('/api/storage/connections');
      if (response.ok) {
        const data = await response.json();
        const typedConnections = (data.connections || []).map((conn: any) => ({
          ...conn,
          storageType: conn.storageType === 's3' ? 's3' : 'googleDrive',
        })) as StorageConnection[];

        setConnections(typedConnections);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to fetch storage connections',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching connections:', error);
      toast({
        title: 'Error',
        description: 'Something went wrong while fetching your connections.',
        variant: 'destructive',
      });
    }
  }, []);

  useEffect(() => {
    const handleGoogleDriveFileSelected = (event: Event) => {
      if (event instanceof CustomEvent) {
        const file = (event.detail as { file: File }).file;

        Papa.parse(file, {
          complete: (results) => {
            const data = results.data as string[][];

            const newTasks: Task[] = data.slice(1).map((row, index) => ({
              id: index + 1,
              values: Object.fromEntries(
                placeholders.map((placeholder, i) => [
                  placeholder.index,
                  {
                    content: row[i] || '',
                    fileType: 'document' as const,
                  } as TaskValue,
                ])
              ),
            }));

            setTasks(newTasks);
          },
          header: false,
          skipEmptyLines: true,
        });
      }
    };

    window.addEventListener(
      'googleDriveFileSelected',
      handleGoogleDriveFileSelected as EventListener
    );

    return () => {
      window.removeEventListener(
        'googleDriveFileSelected',
        handleGoogleDriveFileSelected as EventListener
      );
    };
  }, [placeholders]);

  const handleAnnotatorAssignmentToggle = async (checked: boolean) => {
    try {
      const result = await updateTestTemplate(template._id, checked);
      const updatedTemplate = JSON.parse(result);

      setAssignToAllAnnotators(updatedTemplate.testTemplate);

      if (updatedTemplate.testTemplate) {
        setGlobalRepeat(filteredAnnotators.length);
        setShowFilters(true);
      } else {
        setGlobalRepeat(1);
        setShowFilters(false);
        setSelectedDomain([]);
        setSelectedLanguage([]);
        setSelectedLocation([]);
      }
    } catch (error) {
      console.error('Error updating template:', error);
      setAssignToAllAnnotators(!checked);
      toast({
        title: 'Error',
        description: 'Failed to update template settings',
        variant: 'destructive',
      });
    }
  };

  const clearAllFilters = () => {
    setSelectedDomain([]);
    setSelectedLanguage([]);
    setSelectedLocation([]);
  };

  useEffect(() => {
    try {
      const content = JSON.parse(template.content);
      const extractedPlaceholders: Placeholder[] = [];

      const extractPlaceholders = (item: any) => {
        if (item.type && item.type.startsWith('dynamic')) {
          let type: 'text' | 'video' | 'img' | 'audio' | 'upload' | 'carousel';
          switch (item.type) {
            case 'dynamicText':
              type = 'text';
              break;
            case 'dynamicVideo':
              type = 'video';
              break;
            case 'dynamicImage':
              type = 'img';
              break;
            case 'dynamicImageAnnotation':
              type = 'img';
              break;
            case 'dynamicAudio':
              type = 'audio';
              break;
            case 'dynamicUpload':
              type = 'upload';
              break;
            case 'dynamicCarousel':
              type = 'carousel';
              break;
            default:
              if (Array.isArray(item.content)) {
                item.content.forEach(extractPlaceholders);
              }
              return;
          }

          extractedPlaceholders.push({
            type,
            index: extractedPlaceholders.length,
            name: item.name,
          });
        }
        else if (Array.isArray(item.content)) {
          item.content.forEach(extractPlaceholders);
        }
      };

      content.forEach(extractPlaceholders);
      setPlaceholders(extractedPlaceholders);
    } catch (error) {
      console.error('Error parsing template content:', error);
      toast({
        title: 'Template Error',
        description:
          'Failed to parse template content. Please check the template format.',
        variant: 'destructive',
      });
    }
  }, [template]);

  const handleAddTask = () => {
    setTasks((prevTasks) => [
      ...prevTasks,
      { id: prevTasks.length + 1, values: {} },
    ]);
  };

  const handleRemoveTask = (id: number) => {
    setTasks((prevTasks) => prevTasks.filter((task) => task.id !== id));
  };

  const handleInputChange = (
    taskId: number,
    placeholder: Placeholder,
    value: string
  ) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              values: {
                ...task.values,
                [placeholder.index]: {
                  content: value,
                  fileType:
                    (task.values[placeholder.index] as TaskValue)?.fileType ||
                    'document',
                },
              },
            }
          : task
      )
    );
  };

  const handleFileTypeChange = (
    taskId: number,
    placeholder: Placeholder,
    fileType: 'image' | 'video' | 'document' | 'audio'
  ) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              values: {
                ...task.values,
                [placeholder.index]: {
                  content:
                    (task.values[placeholder.index] as TaskValue)?.content ||
                    '',
                  fileType,
                },
              },
            }
          : task
      )
    );
  };

  const handleGlobalRepeatChange = (value: number) => {
    if (!assignToAllAnnotators) {
      setGlobalRepeat(Math.max(1, value));
    }
  };

  const renderPlaceholderInput = (task: Task, placeholder: Placeholder) => {
    if (placeholder.type === 'carousel') {
      const templateContent = JSON.parse(template.content);
      console.log('template content', templateContent);
      const carouselElement = templateContent?.[0]?.content?.find(
        (item: any) =>
          item.name === placeholder.name && item.type === 'dynamicCarousel'
      );

      if (!carouselElement) {
        console.error(
          'Carousel element not found for placeholder:',
          placeholder.name
        );
        return;
      }
      const carouselProperties: CarouselContent = carouselElement?.content || {
        slides: [{ type: 'text', innerText: '' }],
        keyboardNav: true,
        autoSlide: false,
        slideInterval: 5000,
      };

      console.log('courseElement:', carouselElement);

      const currentSlides =
        (task.values[placeholder.index] as CarouselContent)?.slides ||
        carouselProperties.slides.map(
          (slide: { type: string; src?: string; innerText?: string }) => ({
            ...slide,
            innerText: slide.innerText || '',
            src: slide.src || '',
          })
        );

      console.log('currentSlides:', currentSlides);

      return (
        <div className='border rounded p-4 space-y-4'>
          <h4 className='text-lg font-semibold'>
            Carousel Content for {placeholder.name}
          </h4>

          {currentSlides.map((slide, index) => (
            <div key={index} className='mb-4 p-2 border rounded'>
              <div className='flex items-center justify-between mb-2'>
                <label className='block text-sm font-medium text-gray-700'>
                  Slide {index + 1} ({slide.type})
                </label>
              </div>

              {slide.type === 'text' && (
                <Input
                  value={slide.innerText || ''}
                  onChange={(e) => {
                    setTasks((prevTasks) =>
                      prevTasks.map((t) =>
                        t.id === task.id
                          ? {
                              ...t,
                              values: {
                                ...t.values,
                                [placeholder.index]: {
                                  ...carouselProperties,
                                  slides: currentSlides.map((s, i) =>
                                    i === index
                                      ? { ...s, innerText: e.target.value }
                                      : s
                                  ),
                                },
                              },
                            }
                          : t
                      )
                    );
                  }}
                  placeholder={`Enter text for Slide ${index + 1}`}
                  className='w-full'
                />
              )}

              {slide.type === 'image' && (
                <Input
                  value={slide.src || ''}
                  onChange={(e) => {
                    setTasks((prevTasks) =>
                      prevTasks.map((t) =>
                        t.id === task.id
                          ? {
                              ...t,
                              values: {
                                ...t.values,
                                [placeholder.index]: {
                                  ...carouselProperties,
                                  slides: currentSlides.map((s, i) =>
                                    i === index
                                      ? { ...s, src: e.target.value }
                                      : s
                                  ),
                                },
                              },
                            }
                          : t
                      )
                    );
                  }}
                  placeholder={`Enter image URL for Slide ${index + 1}`}
                  className='w-full'
                />
              )}

              {slide.type === 'video' && (
                <Input
                  value={slide.src || ''}
                  onChange={(e) => {
                    setTasks((prevTasks) =>
                      prevTasks.map((t) =>
                        t.id === task.id
                          ? {
                              ...t,
                              values: {
                                ...t.values,
                                [placeholder.index]: {
                                  ...carouselProperties,
                                  slides: currentSlides.map((s, i) =>
                                    i === index
                                      ? { ...s, src: e.target.value }
                                      : s
                                  ),
                                },
                              },
                            }
                          : t
                      )
                    );
                  }}
                  placeholder={`Enter video URL for Slide ${index + 1}`}
                  className='w-full'
                />
              )}
            </div>
          ))}
        </div>
      );
    }
    
    if (placeholder.type === 'upload') {
      return (
        <div className='space-y-2'>
          <div className='flex gap-2'>
            <Input
              id={`${task.id}-${placeholder.index}`}
              value={
                (task.values[placeholder.index] as TaskValue)?.content || ''
              }
              onChange={(e) =>
                handleInputChange(task.id, placeholder, e.target.value)
              }
              placeholder={`Enter file URL for ${placeholder.name}`}
              className='flex-1'
            />
            <Select
              value={
                (task.values[placeholder.index] as TaskValue)?.fileType ||
                'document'
              }
              onValueChange={(
                value: 'image' | 'video' | 'document' | 'audio'
              ) => handleFileTypeChange(task.id, placeholder, value)}
            >
              <SelectTrigger className='w-32'>
                <SelectValue placeholder='File Type' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='image'>Image</SelectItem>
                <SelectItem value='video'>Video</SelectItem>
                <SelectItem value='document'>Document</SelectItem>
                <SelectItem value='audio'>Audio</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );
    }

    return (
      <div className='flex items-center space-x-4'>
        <Input
          id={`${task.id}-${placeholder.index}`}
          value={(task.values[placeholder.index] as TaskValue)?.content || ''}
          onChange={(e) =>
            handleInputChange(task.id, placeholder, e.target.value)
          }
          placeholder={`Enter ${placeholder.type} or AI prompt`}
        />
        <Button
          onClick={() => {
            setCurrentTask(task);
            setCurrentPlaceholder(placeholder);
            setIsGeneratingForAll(false);
            setIsAiModalOpen(true);
          }}
          variant={'outline'}
        >
          AI
        </Button>
      </div>
    );
  };

  const handleGenerateAI = async (task: Task, placeholder: Placeholder) => {
    try {
      const response = await generateAiResponse(
        provider,
        selectedModel,
        systemPrompt,
        projectId,
        apiKey
      );
      handleInputChange(task.id, placeholder, response);
      return response;
    } catch (error) {
      console.error('Error generating AI response:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate AI response',
        variant: 'destructive',
      });
      throw error;
    }
  };

  useEffect(() => {
    if (
      isGeneratingForAll &&
      provider &&
      selectedModel &&
      systemPrompt &&
      apiKey &&
      selectedPlaceholder &&
      numberOfTasks &&
      !isLoading
    ) {
      setIsLoading(true);
      handleGenerateAIForAllPlaceholders().finally(() => {
        setIsGeneratingForAll(false);
        setIsLoading(false);
      });
    }
  }, [
    isGeneratingForAll,
    provider,
    selectedModel,
    systemPrompt,
    apiKey,
    selectedPlaceholder,
    numberOfTasks,
    isLoading,
  ]);

  const handleConfigureAi = async (
    provider: string,
    model: string,
    systemPrompt: string,
    apiKey: string,
    task: Task,
    placeholder: Placeholder
  ) => {
    console.log('=== handleConfigureAi called ===');

    setProvider(provider);
    setSelectedModel(model);
    setSystemPrompt(systemPrompt);
    setApiKey(apiKey);
    setCurrentTask(task);
    setCurrentPlaceholder(placeholder);

    try {
      setIsLoading(true);
      const response = await generateAiResponse(
        provider,
        model,
        systemPrompt,
        projectId,
        apiKey
      );

      handleInputChange(task.id, placeholder, response);

      setIsAiModalOpen(false);
      setIsGeneratingForAll(false);
    } catch (error) {
      console.error('Error generating AI response:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate AI response',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfigureAiForAll = async (
    provider: string,
    model: string,
    systemPrompt: string,
    apiKey: string,
    placeholder: any,
    numberOfTasks: any
  ) => {
    setProvider(provider);
    setSelectedModel(model);
    setSystemPrompt(systemPrompt);
    setApiKey(apiKey);
    setSelectedPlaceholder(placeholder);
    setNumberOfTasks(numberOfTasks);

    setIsGeneratingForAll(true);
  };

  const renderFilledTemplate = (values: {
    [key: string]: TaskValue | CarouselContent;
  }) => {
    try {
      let content = JSON.parse(template.content);

      const fillContent = (item: any): any => {
        if (item.type && item.type.startsWith('dynamic')) {
          const placeholder = placeholders.find((p) => p.name === item.name);
          if (placeholder) {
            if (item.type === 'dynamicCarousel') {
              const carouselValue = values[
                placeholder.index
              ] as CarouselContent;
              return {
                ...item,
                content: {
                  ...item.content,
                  ...carouselValue,
                },
              };
            }
            if (item.type === 'dynamicAudio') {
              const currentContent = item.content || {};
              return {
                ...item,
                content: {
                  ...currentContent,
                  src:
                    (values[placeholder.index] as TaskValue)?.content ||
                    `{{${placeholder.type}}}`,
                  transcribeEnabled: currentContent.transcribeEnabled || false,
                  transcriptionModel:
                    currentContent.transcriptionModel ||
                    'openai-whisper-large-v2',
                  apiKey: currentContent.apiKey || '',
                  language: currentContent.language || 'en',
                  transcription: currentContent.transcription || '',
                },
              };
            }
            if (item.type === 'inputText') {
              const currentContent = item.content || {};
              return {
                ...item,
                content: {
                  ...currentContent,
                  innerText:
                    (values[placeholder.index] as TaskValue)?.content ||
                    `{{${placeholder.type}}}`,
                  translationEnabled:
                    currentContent.translationEnabled || false,
                  translationModel: currentContent.translationModel || 'deepl',
                  translationApiKey: currentContent.translationApiKey || '',
                  sourceLanguage: currentContent.sourceLanguage || 'auto',
                  targetLanguage: currentContent.targetLanguage || 'en',
                  translation: currentContent.translation || '',
                },
              };
            }
            if (item.type === 'dynamicUpload') {
              const fileType =
                (values[placeholder.index] as TaskValue)?.fileType ||
                'document';
              if (fileType === 'document') {
                const textContent =
                  (values[placeholder.index] as TaskValue)?.content ||
                  `{{${placeholder.type}}}`;
                return {
                  ...item,
                  type: 'dynamicText',
                  content: {
                    type: 'any',
                    limit: 1,
                    src: textContent,
                    innerText: textContent,
                  },
                };
              }
              const dynamicType = `dynamic${fileType.charAt(0).toUpperCase()}${fileType.slice(1)}`;
              return {
                ...item,
                type: dynamicType,
                content: {
                  ...item.content,
                  src:
                    (values[placeholder.index] as TaskValue)?.content ||
                    `{{${placeholder.type}}}`,
                },
              };
            } else if (item.type === 'dynamicText') {
              return {
                ...item,
                content: {
                  ...item.content,
                  innerText:
                    (values[placeholder.index] as TaskValue)?.content ||
                    `{{${placeholder.type}}}`,
                },
              };
            } else {
              return {
                ...item,
                content: {
                  ...item.content,
                  src:
                    (values[placeholder.index] as TaskValue)?.content ||
                    `{{${placeholder.type}}}`,
                },
              };
            }
          }
        }
        if (Array.isArray(item.content)) {
          return { ...item, content: item.content.map(fillContent) };
        }
        return item;
      };

      content = content.map(fillContent);
      return JSON.stringify(content);
    } catch (error) {
      console.error('Error rendering filled template:', error);
      toast({
        title: 'Render Error',
        description:
          'Failed to render filled template. Please check the input values.',
        variant: 'destructive',
      });
      return '';
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        complete: (results) => {
          // Treat the first row as headers
          const headers = results.data[0] as string[];

          // Validate column count
          if (headers.length !== placeholders.length) {
            const errorDetails = {
              csvHeaders: headers,
              templatePlaceholders: placeholders.map((p) => p.name),
              csvHeaderCount: headers.length,
              placeholderCount: placeholders.length,
            };

            toast({
              title: 'CSV Error',
              description: `Column Mismatch: CSV has ${headers.length} columns, but template expects ${placeholders.length} placeholders.\n\nCSV Headers: ${headers.join(', ')}\nTemplate Placeholders: ${placeholders.map((p) => p.name).join(', ')}`,
              variant: 'destructive',
              duration: 10000, // Longer display time to read
            });
            return;
          }

          // Create new tasks from CSV data
          const newTasks = (results.data as string[][])
            .slice(1) // Skip header row
            .map((row, index) => {
              return {
                id: index + 1,
                values: Object.fromEntries(
                  placeholders.map((placeholder, i) => [
                    placeholder.index,
                    {
                      content: row[i] || '',
                      fileType: 'document' as
                        | 'image'
                        | 'video'
                        | 'document'
                        | 'audio', // Default file type for uploads
                    },
                  ])
                ),
              };
            });

          // Update tasks state with new tasks from CSV
          setTasks(newTasks);
        },
        header: false, // Treat first row as data, not automatic headers
        skipEmptyLines: true, // Ignore empty lines
        error: (error) => {
          toast({
            title: 'CSV Parsing Error',
            description: error.message,
            variant: 'destructive',
          });
        },
      });
    }
  };

  const generateFilledTemplates = async () => {
    try {
      if (
        !project ||
        !project._id ||
        typeof project._id !== 'string' ||
        project._id === 'data'
      ) {
        toast({
          title: 'Invalid Project',
          description: 'Project ID is invalid or missing',
          variant: 'destructive',
        });
        return;
      }

      const filledTasks: FilledTask[] = [];
      const repeatTasks: RepeatTask[] = [];
      let repeatTaskCount;
      
      tasks.forEach((task) => {
        const filled = renderFilledTemplate(task.values);

        if (assignToAllAnnotators) {
          repeatTasks.push({
            project: project._id,
            name: `${project.name} - ${template.name} - Task${task.id}`,
            content: filled,
            timer: template.timer,
            annotator: null,
            reviewer: '',
            template: template._id,
            type: 'test',
          });
        } else {
          for (let i = 0; i < globalRepeat; i++) {
            filledTasks.push({
              project: project._id,
              name: `${project.name} - ${template.name} - Task${task.id}.${
                i + 1
              }`,
              content: filled,
              timer: template.timer,
              reviewer: '',
              type: template.type,
              template: template._id,
            });
          }
        }
      });

      const response = (await createTasks(
        filledTasks
      )) as unknown as CreateTasksResponse;
      
      if (assignToAllAnnotators) {
        // Pass the filtered annotators to the createRepeatTask function
        const createRepeatResponse = await createRepeatTask(repeatTasks, filteredAnnotators);
        repeatTaskCount = createRepeatResponse.createdTasks;
        if (!createRepeatResponse.success) {
          throw new Error('Failed to save repeat tasks');
        }
      }

      if (assignToAllAnnotators) {
        toast({
          title: 'Tasks created successfully',
          description: `Created tasks for ${filteredAnnotators.length} filtered annotators`,
        });
      } else {
        toast({
          title: 'Tasks created successfully',
          description: `Created ${filledTasks.length} tasks`,
        });
      }

      setTasks([{ id: 1, values: {} }]);
      setGlobalRepeat(1);
      setAssignToAllAnnotators(false);
      setIsDialogOpen(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: error.message,
      });
    }
  };

  const proceedWithTaskCreation = async (tasksToCreate: Task[]) => {
    try {
      setIsLoading(true);
      const filledTasks: FilledTask[] = [];
      const repeatTasks: RepeatTask[] = [];

      tasksToCreate.forEach((task) => {
        const filled = renderFilledTemplate(task.values);

        if (assignToAllAnnotators) {
          repeatTasks.push({
            project: project._id,
            name: `${project.name} - ${template.name} - Task${task.id}`,
            content: filled,
            timer: template.timer,
            annotator: null,
            reviewer: '',
            template: template._id,
            type: 'test',
          });
        } else {
          for (let i = 0; i < globalRepeat; i++) {
            filledTasks.push({
              project: project._id,
              name: `${project.name} - ${template.name} - Task${task.id}.${i + 1}`,
              content: filled,
              timer: template.timer,
              reviewer: '',
              type: template.type,
              template: template._id,
            });
          }
        }
      });

      const response = (await createTasks(
        filledTasks
      )) as unknown as CreateTasksResponse;

      if (assignToAllAnnotators) {
        const createRepeatResponse = await createRepeatTask(repeatTasks);
        const repeatTaskCount = createRepeatResponse.createdTasks;

        if (!createRepeatResponse.success) {
          throw new Error('Failed to save repeat tasks');
        }

        toast({
          title: 'Tasks created successfully',
          description: `Created ${repeatTaskCount} tasks and ${repeatTasks.length} repeat tasks successfully`,
        });
      } else {
        toast({
          title: 'Tasks created successfully',
          description: `Created ${filledTasks.length} tasks successfully`,
        });
      }

      setTasks([{ id: 1, values: {} }]);
      setGlobalRepeat(1);
      setAssignToAllAnnotators(false);
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error('Error creating tasks:', error);
      toast({
        variant: 'destructive',
        title: 'Error creating tasks',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateTaskHelper = (response: any) => {
    console.log('init', response);
    setTasks((prevTasks) => {
      let updatedTasks = [...prevTasks];

      // Process each AI response
      response.forEach((response: any, index: number) => {
        // If we need more tasks, add them
        if (index >= updatedTasks.length) {
          updatedTasks.push({
            id: updatedTasks.length + 1,
            values: {},
          });
        }

        // Update the task with AI response
        updatedTasks[index] = {
          ...updatedTasks[index],
          values: {
            ...updatedTasks[index].values,
            [selectedPlaceholder.index]: {
              content: response,
              fileType: 'document',
            },
          },
        };
      });

      setIsMultiAiModalOpen(false);
      return updatedTasks;
    });
  };

  const handleGenerateAIForAllPlaceholders = async () => {
    console.log('=== handleGenerateAIForAllPlaceholders called ===');
    console.log('Initial state:', {
      numberOfTasks,
      currentTasksLength: tasks.length,
      provider,
      selectedModel,
      hasPlaceholder: !!selectedPlaceholder,
      systemPrompt,
      isGeneratingForAll,
    });

    if (
      !provider ||
      !selectedModel ||
      !systemPrompt ||
      !apiKey ||
      !selectedPlaceholder ||
      !numberOfTasks
    ) {
      console.error('Missing required parameters for AI generation');
      return;
    }

    try {
      const modifiedPrompt = `You are supposed to give help me assign student tasks, your response should be seperated by numbers & 
      limited to this many numbers ${numberOfTasks}. what I want is: ${systemPrompt}. remember to follow the order & 
      the total response quantity should be: ${numberOfTasks}`;

      console.log('Modified prompt:', modifiedPrompt);

      const response = await generateAiResponse(
        provider,
        selectedModel,
        modifiedPrompt,
        projectId,
        apiKey
      );

      const allMatches = response.match(/^\d+\.\s*.+$/gm) || [];
      const parsedQuestions = allMatches
        .slice(0, numberOfTasks)
        .map((match: any) => match.replace(/^\d+\.\s*/, '').trim());

      setAiResponse(parsedQuestions);
      updateTaskHelper(parsedQuestions);

      return parsedQuestions;
    } catch (error) {
      console.error('Error in task generation:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (
      isGeneratingForAll &&
      provider &&
      selectedModel &&
      systemPrompt &&
      apiKey &&
      ((selectedPlaceholder && numberOfTasks) ||
        (currentTask && currentPlaceholder)) &&
      !isLoading
    ) {
      console.log('Triggering AI generation from useEffect');
      setIsLoading(true);
      if (selectedPlaceholder && numberOfTasks) {
        handleGenerateAIForAllPlaceholders()
          .then(() => {
            setIsGeneratingForAll(false);
            setIsMultiAiModalOpen(false);
          })
          .finally(() => {
            setIsLoading(false);
          });
      } else if (currentTask && currentPlaceholder) {
        handleGenerateAI(currentTask, currentPlaceholder)
          .then(() => {
            setIsGeneratingForAll(false);
          })
          .finally(() => {
            setIsLoading(false);
          });
      }
    }
  }, [isGeneratingForAll]);

  return (
    <div>
      <AIConfigModal
        onConfigure={(provider, model, systemPrompt, apiKey) =>
          handleConfigureAi(
            provider,
            model,
            systemPrompt,
            apiKey,
            currentTask!,
            currentPlaceholder!
          )
        }
        isAIModalOpen={isAiModalOpen}
        setIsAIModalOpen={() => setIsAiModalOpen(false)}
        tasks={tasks}
        placeholders={placeholders}
      />

      <MultiAIModal
        onConfigure={(
          provider,
          model,
          systemPrompt,
          apiKey,
          placeholder,
          numberOfTasks
        ) =>
          handleConfigureAiForAll(
            provider,
            model,
            systemPrompt,
            apiKey,
            placeholder,
            numberOfTasks
          )
        }
        isAIModalOpen={isMultiAiModalOpen}
        setIsAIModalOpen={() => setIsMultiAiModalOpen(false)}
        tasks={tasks}
        placeholders={placeholders}
        selectedPlaceholder={selectedPlaceholder}
        setSelectedPlaceholder={setSelectedPlaceholder}
        numberOfTasks={numberOfTasks}
        setNumberOfTasks={setNumberOfTasks}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className='sm:max-w-[425px] md:max-w-fit'>
          <DialogHeader className='flex flex-col gap-4'>
            <div className='flex flex-row items-center justify-between pr-8'>
              <DialogTitle className='flex-1'>Ingest Data</DialogTitle>
              <div className='flex items-center gap-2 ml-4'>
                <label
                  htmlFor='global-repeat'
                  className='text-sm font-medium text-gray-700'
                >
                  Repeat Each Task:
                </label>
                <Input
                  id='global-repeat'
                  type='number'
                  min='1'
                  value={globalRepeat}
                  onChange={(e) =>
                    handleGlobalRepeatChange(parseInt(e.target.value, 10))
                  }
                  className='w-20'
                  disabled={assignToAllAnnotators}
                />
              </div>
            </div>
            
            {template.type === 'test' && (
              <div className='flex flex-col space-y-4 p-4 bg-gray-50 rounded-lg shadow-sm'>
                {/* Assign to all annotators toggle */}
                <div className='flex items-center justify-between'>
                  <div className='flex items-center space-x-3'>
                    <Switch
                      checked={assignToAllAnnotators}
                      onCheckedChange={handleAnnotatorAssignmentToggle}
                      className='transition duration-200 ease-in-out'
                    />
                    <label className='text-sm font-medium text-gray-700'>
                      Assign to all annotators ({filteredAnnotators.length} filtered annotators)
                    </label>
                  </div>
                  
                  {assignToAllAnnotators && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFilters(!showFilters)}
                      className='flex items-center gap-2'
                    >
                      <Filter className='h-4 w-4' />
                      {showFilters ? 'Hide' : 'Show'} Filters
                    </Button>
                  )}
                </div>

                {/* Annotator filters - only show when assign to all is enabled */}
                {assignToAllAnnotators && showFilters && (
                  <div className='space-y-4 border-t pt-4'>
                    <div className='flex items-center justify-between'>
                      <h4 className='text-sm font-medium text-gray-700'>Filter Annotators</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearAllFilters}
                        className='text-xs'
                      >
                        Clear All
                      </Button>
                    </div>
                    
                    <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
                      <div>
                        <label className='block text-xs font-medium text-gray-600 mb-1'>
                          Domain
                        </label>
                        <MultiCombobox
                          options={domainOptions}
                          value={selectedDomain}
                          onChange={setSelectedDomain}
                          placeholder='Filter Domain'
                        />
                      </div>
                      
                      <div>
                        <label className='block text-xs font-medium text-gray-600 mb-1'>
                          Language
                        </label>
                        <MultiCombobox
                          options={languageOptions}
                          value={selectedLanguage}
                          onChange={setSelectedLanguage}
                          placeholder='Filter Language'
                        />
                      </div>
                      
                      <div>
                        <label className='block text-xs font-medium text-gray-600 mb-1'>
                          Location
                        </label>
                        <MultiCombobox
                          options={locationOptions}
                          value={selectedLocation}
                          onChange={setSelectedLocation}
                          placeholder='Filter Location'
                        />
                      </div>
                    </div>

                    {/* Show active filters */}
                    {(selectedDomain.length > 0 || selectedLanguage.length > 0 || selectedLocation.length > 0) && (
                      <div className='flex flex-wrap gap-2'>
                        {selectedDomain.map((domain) => (
                          <Badge key={domain} variant="secondary" className='text-xs'>
                            Domain: {domain}
                          </Badge>
                        ))}
                        {selectedLanguage.map((lang) => (
                          <Badge key={lang} variant="secondary" className='text-xs'>
                            Language: {lang}
                          </Badge>
                        ))}
                        {selectedLocation.map((loc) => (
                          <Badge key={loc} variant="secondary" className='text-xs'>
                            Location: {loc}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Show filtered annotators count */}
                    <div className='text-sm text-gray-600 bg-blue-50 p-2 rounded'>
                      {filteredAnnotators.length} of {annotators.length} annotators match the current filters
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogHeader>
          
          <div className='max-h-[60vh] overflow-y-auto'>
            {tasks.map((task) => (
              <div key={task.id} className='mb-4 p-2 border rounded'>
                <div className='flex justify-between items-center mb-2'>
                  <h3 className='text-lg font-semibold'>Task {task.id}</h3>
                  <div className='flex items-center space-x-2'>
                    <Button
                      variant='ghost'
                      size='icon'
                      onClick={() => handleRemoveTask(task.id)}
                    >
                      <Minus className='h-4 w-4' />
                    </Button>
                  </div>
                </div>
                {placeholders.map((placeholder) => (
                  <div key={placeholder.index} className='mb-2'>
                    <label
                      htmlFor={`${task.id}-${placeholder.index}`}
                      className='block text-sm font-medium text-gray-700'
                    >
                      {placeholder.name} ({placeholder.type})
                    </label>
                    {renderPlaceholderInput(task, placeholder)}
                  </div>
                ))}
              </div>
            ))}
          </div>
          
          <DialogFooter className='flex w-full'>
            <Button onClick={handleAddTask} className='mr-auto'>
              <Plus className='mr-2 h-4 w-4' /> Add More Task
            </Button>
            <div className='flex gap-2'>
              <CloudStorageFileBrowser
                connections={connections}
                onSelectFiles={async (fileUrls: string[]) => {
                  if (fileUrls && fileUrls.length > 0) {
                    const fileUrl = fileUrls[0];
                    console.log('Selected file URL:', fileUrl);
                    setIsLoading(true);

                    try {
                      const response = await fetch(fileUrl, {
                        headers: {
                          Accept: 'text/csv,text/plain,*/*',
                        },
                      });

                      console.log(
                        'Response status:',
                        response.status,
                        response.statusText
                      );

                      if (!response.ok) {
                        let errorMessage = `Failed to fetch CSV: ${response.status} ${response.statusText}`;
                        try {
                          const errorData = await response.json();
                          if (errorData.error) {
                            errorMessage = errorData.error;
                            if (errorData.details) {
                              errorMessage += `: ${errorData.details}`;
                            }
                          }
                        } catch (e) {
                          // If we can't parse the error as JSON, use the default message
                        }
                        throw new Error(errorMessage);
                      }

                      const csvText = await response.text();
                      console.log('CSV content length:', csvText.length);

                      if (!csvText || csvText.trim() === '') {
                        throw new Error('Downloaded CSV file is empty');
                      }

                      Papa.parse(csvText, {
                        complete: (results) => {
                          if (!results.data || results.data.length === 0) {
                            throw new Error('No data found in CSV file');
                          }

                          const dataRows =
                            results.data.length > 1
                              ? (results.data.slice(1) as string[][])
                              : (results.data as string[][]);

                          const newTasks = dataRows
                            .filter(
                              (row) =>
                                Array.isArray(row) &&
                                row.some(
                                  (cell) => cell && String(cell).trim() !== ''
                                )
                            )
                            .map((row, index) => ({
                              id: index + 1,
                              values: Object.fromEntries(
                                placeholders.map((placeholder, i) => [
                                  placeholder.index,
                                  {
                                    content:
                                      i < row.length
                                        ? String(row[i] || '')
                                        : '',
                                    fileType: 'document' as
                                      | 'image'
                                      | 'video'
                                      | 'document'
                                      | 'audio',
                                  },
                                ])
                              ),
                            }));

                          setTasks(newTasks);
                          setIsLoading(false);

                          toast({
                            title: 'CSV Loaded',
                            description: `Loaded ${newTasks.length} entries from CSV`,
                            duration: 3000,
                          });
                        },
                        error: (error: any) => {
                          console.error('CSV parsing error:', error);
                          setIsLoading(false);
                          toast({
                            title: 'CSV Parsing Error',
                            description: error.message,
                            variant: 'destructive',
                          });
                        },
                        header: false,
                        skipEmptyLines: true,
                        delimitersToGuess: [',', '\t', '|', ';'],
                      });
                    } catch (error: unknown) {
                      console.error('Error processing file:', error);
                      setIsLoading(false);
                      toast({
                        title: 'Error',
                        description:
                          error instanceof Error
                            ? error.message
                            : 'Failed to process file',
                        variant: 'destructive',
                      });
                    }
                  }
                }}
              />
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload className='mr-2 h-4 w-4' /> Upload CSV
              </Button>
              <input
                type='file'
                ref={fileInputRef}
                className='hidden'
                accept='.csv'
                onChange={handleFileUpload}
              />
              <Button onClick={generateFilledTemplates}>
                Save Tasks ({assignToAllAnnotators ? `${tasks.length} tasks for ${filteredAnnotators.length} annotators` : `${tasks.length * globalRepeat} total`})
              </Button>
              <Button
                onClick={() => {
                  setCurrentTask(null);
                  setCurrentPlaceholder(null);
                  setProvider('');
                  setSelectedModel('');
                  setSystemPrompt('');
                  setApiKey('');
                  setIsGeneratingForAll(false);
                  setIsMultiAiModalOpen(true);
                }}
              >
                Bulk Data Generation with AI
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}