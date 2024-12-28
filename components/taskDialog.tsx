"use client";

import { createTasks, saveRepeatTasks } from "@/app/actions/task";
import { Project } from "@/app/(maneger)/page";
import { template } from "@/app/template/page";
import { Button } from "@/components/ui/button";
import { getTemplate } from "@/app/actions/template";
import { getAllAnnotators } from "@/app/actions/annotator";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { ArrowRight, Minus, Plus, Settings, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { updateTestTemplate } from "@/app/actions/template";
import Papa from "papaparse";
import { CarouselContent } from "./ui/carousel";
import AIConfigModal from "./AiModal";
import { generateAiResponse } from "@/app/actions/aiModel";
import { usePathname } from "next/navigation";

interface TaskValue {
  content: string;
  fileType?: "image" | "video" | "document" | "audio";
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

interface Task {
  id: number;
  values: {
    [key: string]: TaskValue | CarouselContent;
  };
}

interface Placeholder {
  type: "text" | "video" | "img" | "audio" | "upload" | "carousel";
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
  type:string;
  template:string;
}

interface RepeatTask {
  project: string;
  name: string;
  content: string;
  timer: number;
  annotator?: string | null;
  reviewer: string;
  template:string;

}

export interface Annotator {
  _id: string;
  name: string;
  email: string;
  lastLogin: string;
  permission?: string[];
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
  _id:string;
  user:string;
  projectid:string;
  name:string;
  apiKey:string;
  provider:string;
  enabled:boolean;
  model:string
}

export function TaskDialog({
  onConfigure,
  aiModels,
  template,
  isDialogOpen,
  setIsDialogOpen,
  project,
  handleAssignUser,
}: {
  onConfigure:(projectId:string)=>Promise<any>
  aiModels:Model[] | undefined
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
  const [provider,setProvider]=useState('')
  const [placeholders, setPlaceholders] = useState<Placeholder[]>([]);
  const [tasks, setTasks] = useState<Task[]>([{ id: 1, values: {} }]);
  const [globalRepeat, setGlobalRepeat] = useState(1);
  const [assignToAllAnnotators, setAssignToAllAnnotators] = useState(
    template.testTemplate || false
  );
  const [annotators, setAnnotators] = useState<Annotator[]>([]);
  const [systemPrompt,setSystemPrompt]=useState('')
  const [apiKey,setApiKey]=useState('')
  const [generateAi,setGenerateAi]=useState(false)
  const [selectedModel, setSelectedModel] = useState("");
  const [currentTask,setCurrentTask]=useState<Task>()
  const [currentPlaceholder,setCurrentPlaceholder]=useState<Placeholder>()
  const fileInputRef = useRef<HTMLInputElement>(null); 
  const [isAiModalOpen,setIsAiModalOpen]=useState(false)
  useEffect(() => {
    if (isDialogOpen) {
      fetchCurrentTemplateState();
      fetchAnnotators();
    }
  }, [isDialogOpen]);

  const pathName = usePathname();
  const projectId = pathName.split("/")[2];
  const fetchAnnotators = async () => {
    try {
      const annotatorsData = JSON.parse(
        await getAllAnnotators()
      ) as Annotator[];
      setAnnotators(annotatorsData);
      if (assignToAllAnnotators) {
        setGlobalRepeat(annotatorsData.length);
      }
    } catch (error) {
      console.error("Error fetching annotators:", error);
      toast({
        title: "Error",
        description: "Failed to fetch annotators",
        variant: "destructive",
      });
    }
  };

  const fetchCurrentTemplateState = async () => {
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
      console.error("Error fetching template state:", error);
      toast({
        title: "Error",
        description: "Failed to fetch template settings",
        variant: "destructive",
      });
    }
  };


  const handleAnnotatorAssignmentToggle = async (checked: boolean) => {
    try {
      const result = await updateTestTemplate(template._id, checked);
      const updatedTemplate = JSON.parse(result);

      setAssignToAllAnnotators(updatedTemplate.testTemplate);

      if (updatedTemplate.testTemplate && annotators.length > 0) {
        setGlobalRepeat(annotators.length);
      } else {
        setGlobalRepeat(1);
      }
    } catch (error) {
      console.error("Error updating template:", error);
      setAssignToAllAnnotators(!checked);
      toast({
        title: "Error",
        description: "Failed to update template settings",
        variant: "destructive",
      });
    }
  };
  useEffect(() => {
    try {
      const content = JSON.parse(template.content);
      const extractedPlaceholders: Placeholder[] = [];

      const extractPlaceholders = (item: any) => {
        if (Array.isArray(item.content)) {
          item.content.forEach(extractPlaceholders);
        } else if (item.type && item.type.startsWith("dynamic")) {
          let type: "text" | "video" | "img" | "audio" | "upload" | "carousel";
          switch (item.type) {
            case "dynamicText":
              type = "text";
              break;
            case "dynamicVideo":
              type = "video";
              break;
            case "dynamicImage":
              type = "img";
              break;
            case "dynamicAudio":
              type = "audio";
              break;
            case "dynamicUpload":
              type = "upload";
              break;
            case "dynamicCarousel":
              type = "carousel";
              break;
            default:
              return;
          }
          extractedPlaceholders.push({
            type,
            index: extractedPlaceholders.length,
            name: item.name,
          });
        }
      };

      content.forEach(extractPlaceholders);
      setPlaceholders(extractedPlaceholders);
    } catch (error) {
      console.error("Error parsing template content:", error);
      toast({
        title: "Template Error",
        description:
          "Failed to parse template content. Please check the template format.",
        variant: "destructive",
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
                    "document",
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
    fileType: "image" | "video" | "document" | "audio"
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
                    "",
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
    if (placeholder.type === "carousel") {
      const templateContent = JSON.parse(template.content);
      console.log("template content", templateContent);
      const carouselElement = templateContent?.[0]?.content?.find(
        (item: any) =>
          item.name === placeholder.name && item.type === "dynamicCarousel"
      );  
  
      if (!carouselElement) {
        console.error("Carousel element not found for placeholder:", placeholder.name);
        return; 
      }
      const carouselProperties: CarouselContent = carouselElement?.content || {
        slides: [{ type: "text", innerText: "" }],
        keyboardNav: true,
        autoSlide: false,
        slideInterval: 5000,
      };

      console.log("courseElement:", carouselElement);

    const currentSlides =
    (task.values[placeholder.index] as CarouselContent)?.slides ||
    carouselProperties.slides.map(
      (slide: { type: string; src?: string; innerText?: string }) => ({
        ...slide,
        innerText: slide.innerText || "",
        src: slide.src || "",
      })
    );

    console.log("currentSlides:", currentSlides);


    return (
      <div className="border rounded p-4 space-y-4">
        <h4 className="text-lg font-semibold">
          Carousel Content for {placeholder.name}
        </h4>
    
        {currentSlides.map((slide, index) => (
          <div key={index} className="mb-4 p-2 border rounded">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Slide {index + 1} ({slide.type})
              </label>
            </div>
    
            {slide.type === "text" && (
              <Input
                value={slide.innerText || ""}
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
                className="w-full"
              />
            )}
    
            {slide.type === "image" && (
              <Input
                value={slide.src || ""}
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
                className="w-full"
              />
            )}
    
            {slide.type === "video" && (
              <Input
                value={slide.src || ""}
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
                className="w-full"
              />
            )}
          </div>
        ))}
      </div>
    );
  }
    // Existing input rendering logic for other placeholders
    if (placeholder.type === "upload") {
      return (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              id={`${task.id}-${placeholder.index}`}
              value={
                (task.values[placeholder.index] as TaskValue)?.content || ""
              }
              onChange={(e) =>
                handleInputChange(task.id, placeholder, e.target.value)
              }
              placeholder={`Enter file URL for ${placeholder.name}`}
              className="flex-1"
            />
            <Select
              value={
                (task.values[placeholder.index] as TaskValue)?.fileType ||
                "document"
              }
              onValueChange={(
                value: "image" | "video" | "document" | "audio"
              ) => handleFileTypeChange(task.id, placeholder, value)}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="File Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="document">Document</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );
    }




    // Default input rendering for other types
    return (
      <div className="flex items-center space-x-4">
              <Input
        id={`${task.id}-${placeholder.index}`}
        value={(task.values[placeholder.index] as TaskValue)?.content || ""}
        onChange={(e) =>
          handleInputChange(task.id, placeholder, e.target.value)
        }
        placeholder={`Enter ${placeholder.type} or AI prompt`}
      />
      <Button onClick={()=>{
                        setCurrentTask(task)
                        setCurrentPlaceholder(placeholder)
                        setIsAiModalOpen(true)}
                      }
                 variant={'outline'}>
                  AI
                </Button>
      </div>
      
    );
  };
  const handleGenerateAI = async (task:Task,placeholder:Placeholder) => {
    const response = await generateAiResponse(provider,selectedModel,systemPrompt,projectId,apiKey);
    handleInputChange(task.id,placeholder,response)
    console.log(response)
  };

  useEffect(() => {
    // Ensure all necessary states and task/placeholder are present
    if (provider && selectedModel && systemPrompt && apiKey && currentTask && currentPlaceholder) {
      handleGenerateAI(currentTask, currentPlaceholder);
    }
  }, [provider, selectedModel, systemPrompt, apiKey, currentTask, currentPlaceholder]);
  
  const handleConfigureAi = async (
    provider: string,
    model: string,
    systemPrompt: string,
    apiKey: string,
    task: Task,
    placeholder: Placeholder
  ) => {
  
    // Update the necessary state variables
    setProvider(provider);
    setSelectedModel(model);
    setSystemPrompt(systemPrompt);
    setApiKey(apiKey);
  
    // Store task and placeholder in state for later use
    setCurrentTask(task);
    setCurrentPlaceholder(placeholder);
  };
  
  


  const renderFilledTemplate = (values: {
    [key: string]: TaskValue | CarouselContent;
  }) => {
    try {
      let content = JSON.parse(template.content);

      const fillContent = (item: any): any => {
        if (Array.isArray(item.content)) {
          return { ...item, content: item.content.map(fillContent) };
        } else if (item.type && item.type.startsWith("dynamic")) {
          const placeholder = placeholders.find((p) => p.name === item.name);
          if (placeholder) {
            // Handle carousel specifically
            if (item.type === "dynamicCarousel") {
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

            // Existing logic for other dynamic types remains the same
            if (item.type === "dynamicCarousel") {
              const placeholder = placeholders.find(
                (p) => p.name === item.name
              );
              if (placeholder) {
                const carouselValue = values[
                  placeholder.index
                ] as CarouselContent;

                // Create slides with proper type mapping
                const mappedSlides = carouselValue.slides.map((slide) => {
                  // If no type is specified, default to text
                  const slideType = slide.type || "text";

                  // Map slides based on their type
                  switch (slideType) {
                    case "image":
                      return {
                        type: "image",
                        src: slide.src || `{{${placeholder.type}_image}}`,
                        innerText: slide.innerText || "",
                      };
                    case "video":
                      return {
                        type: "video",
                        src: slide.src || `{{${placeholder.type}_video}}`,
                        innerText: slide.innerText || "",
                      };
                    case "text":
                    default:
                      return {
                        type: "text",
                        innerText:
                          slide.innerText || `{{${placeholder.type}_text}}`,
                        src: slide.src || "",
                      };
                  }
                });

                return {
                  ...item,
                  content: {
                    ...item.content,
                    slides: mappedSlides,
                    keyboardNav: carouselValue.keyboardNav ?? true,
                    autoSlide: carouselValue.autoSlide ?? false,
                    slideInterval: carouselValue.slideInterval ?? 5000,
                    currentSlideIndex: carouselValue.currentSlideIndex ?? 0,
                  },
                };
              }
            } else if (item.type === "dynamicUpload") {
              const fileType =
                (values[placeholder.index] as TaskValue)?.fileType ||
                "document";
              if (fileType === "document") {
                const textContent =
                  (values[placeholder.index] as TaskValue)?.content ||
                  `{{${placeholder.type}}}`;
                return {
                  ...item,
                  type: "dynamicText",
                  content: {
                    type: "any",
                    limit: 1,
                    src: textContent,
                    innerText: textContent,
                  },
                };
              }
              const dynamicType = `dynamic${fileType
                .charAt(0)
                .toUpperCase()}${fileType.slice(1)}`;
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
            }else if(item.type==="dynamicText"){
              return {
                ...item,
                content: {
                  ...item.content,
                  innerText:
                    (values[placeholder.index] as TaskValue)?.content ||
                    `{{${placeholder.type}}}`,
                },
              };

            }
             else {
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
        return item;
      };

      content = content.map(fillContent);
      return JSON.stringify(content);
    } catch (error) {
      console.error("Error rendering filled template:", error);
      toast({
        title: "Render Error",
        description:
          "Failed to render filled template. Please check the input values.",
        variant: "destructive",
      });
      return "";
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        complete: (results) => {
          const headers = results.data[0] as string[];

          if (headers.length !== placeholders.length) {
            toast({
              title: "CSV Error",
              description:
                "The number of columns in the CSV does not match the number of placeholders in the template.",
              variant: "destructive",
            });
            return;
          }

          const newTasks = (results.data as string[][])
            .slice(1)
            .map((row, index) => {
              return {
                id: index + 1,
                values: Object.fromEntries(
                  placeholders.map((placeholder, i) => [
                    placeholder.index,
                    {
                      content: row[i] || "",
                      fileType: "document" as
                        | "image"
                        | "video"
                        | "document"
                        | "audio", // Default file type for uploads
                    },
                  ])
                ),
              };
            });
          setTasks(newTasks);
        },
        error: (error) => {
          toast({
            title: "CSV Parsing Error",
            description: error.message,
            variant: "destructive",
          });
        },
      });
    }
  };

  const generateFilledTemplates = async () => {
    try {
      const filledTasks: FilledTask[] = [];
      const repeatTasks: RepeatTask[] = [];
      tasks.forEach((task) => {
        const filled = renderFilledTemplate(task.values);

        if (assignToAllAnnotators) {
          annotators.forEach((annotator) => {
            const newTask = {
              project: project._id,
              name: `${project.name} - ${template.name} - Task${task.id}`,
              content: filled,
              timer: template.timer,
              annotator: annotator._id,
              reviewer: "",
              type:template.type,
              template:template._id
            };
            filledTasks.push(newTask);
          });

          repeatTasks.push({
            project: project._id,
            name: `${project.name} - ${template.name} - Task${task.id}`,
            content: filled,
            timer: template.timer,
            annotator: null,
            reviewer: "",
            template:template._id
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
              reviewer: "",
              type:template.type,
              template:template._id
            });
          }
        }
      });

      const response = (await createTasks(
        filledTasks
      )) as unknown as CreateTasksResponse;

      let repeatresponse: SaveTasksResponse | undefined;
      if (assignToAllAnnotators) {
        try {
          repeatresponse = (await saveRepeatTasks(
            repeatTasks
          )) as unknown as SaveTasksResponse;
          if (!repeatresponse?.success) {
            throw new Error("Failed to save repeat tasks");
          }
        } catch (error) {
          console.log(error);
          toast({
            variant: "destructive",
            title: "Failed to save repeat tasks",
            description:
              (error as any).message ||
              "An unknown error occurred while saving repeat tasks.",
          });
          return;
        }
      }

      if (
        assignToAllAnnotators &&
        response?.success &&
        repeatresponse?.success
      ) {
        const assignments = response.tasks
          .filter((task) => task.annotator)
          .map((task) => handleAssignUser(task.annotator!, task._id, false));

        await Promise.all(assignments);
      }

      toast({
        title: "Tasks created successfully",
        description: `Created ${filledTasks.length} tasks and ${repeatTasks.length} repeat tasks successfully`,
      });

      setTasks([{ id: 1, values: {} }]);
      setGlobalRepeat(1);
      setAssignToAllAnnotators(false);
      setIsDialogOpen(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: error.message,
      });
    }
  };

  return (
    <div>
<AIConfigModal
  onConfigure={(provider, model, systemPrompt,apiKey) =>
    handleConfigureAi(provider, model, systemPrompt,apiKey, currentTask!, currentPlaceholder!)
  }
  isAIModalOpen={isAiModalOpen}
  setIsAIModalOpen={() => setIsAiModalOpen(false)}
/>
   
<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogContent className="sm:max-w-[425px] md:max-w-fit">
        <DialogHeader className="flex flex-col gap-4">
          <div className="flex flex-row items-center justify-between pr-8">
            <DialogTitle className="flex-1">Ingest Data</DialogTitle>
            <div className="flex items-center gap-2 ml-4">
              <label
                htmlFor="global-repeat"
                className="text-sm font-medium text-gray-700"
              >
                Repeat Each Task:
              </label>
              <Input
                id="global-repeat"
                type="number"
                min="1"
                value={globalRepeat}
                onChange={(e) =>
                  handleGlobalRepeatChange(parseInt(e.target.value, 10))
                }
                className="w-20"
                disabled={assignToAllAnnotators}
              />
            </div>
          </div>
          <div className="flex justify-between items-center space-x-6 p-4 bg-gray-50 rounded-lg shadow-sm">
  {/* Left section - Switch for annotator assignment */}
  <div className="flex items-center space-x-3">
    <Switch
      checked={assignToAllAnnotators}
      onCheckedChange={handleAnnotatorAssignmentToggle}
      className="transition duration-200 ease-in-out"
    />
    <label className="text-sm font-medium text-gray-700">
      Assign to all annotators ({annotators.length} annotators)
    </label>
  </div>

  {/* Right section - AI model selector and settings icon */}

</div>


        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          {tasks.map((task) => (
            <div key={task.id} className="mb-4 p-2 border rounded">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">Task {task.id}</h3>
                <div className="flex items-center space-x-2">

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveTask(task.id)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                </div>
              </div>
              {placeholders.map((placeholder) => (
                <div key={placeholder.index} className="mb-2">
                  <label
                    htmlFor={`${task.id}-${placeholder.index}`}
                    className="block text-sm font-medium text-gray-700"
                  >
                    {placeholder.name} ({placeholder.type})
                  </label>
                  {renderPlaceholderInput(task, placeholder)}
                </div>
              ))}
            </div>
          ))}
        </div>
        <DialogFooter className="flex w-full">
          <Button onClick={handleAddTask} className="mr-auto">
            <Plus className="mr-2 h-4 w-4" /> Add More Task
          </Button>
          <div className="flex gap-2">
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" /> Upload CSV
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".csv"
              onChange={handleFileUpload}
            />
            <Button onClick={generateFilledTemplates}>
              Save Tasks ({tasks.length * globalRepeat} total)
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>



    </div>


  );
}