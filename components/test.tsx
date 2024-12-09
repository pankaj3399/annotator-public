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
import { Minus, Plus, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { updateTestTemplate } from "@/app/actions/template";
import Papa from "papaparse";

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
}

interface RepeatTask {
  project: string;
  name: string;
  content: string;
  timer: number;
  annotator?: string | null;
  reviewer: string;
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

export function TaskDialog({
  template,
  isDialogOpen,
  setIsDialogOpen,
  project,
  handleAssignUser,
}: {
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
  const [placeholders, setPlaceholders] = useState<Placeholder[]>([]);
  const [tasks, setTasks] = useState<Task[]>([{ id: 1, values: {} }]);
  const [globalRepeat, setGlobalRepeat] = useState(1);
  const [assignToAllAnnotators, setAssignToAllAnnotators] = useState(
    template.testTemplate || false
  );
  const [annotators, setAnnotators] = useState<Annotator[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isDialogOpen) {
      fetchCurrentTemplateState();
      fetchAnnotators();
    }
  }, [isDialogOpen]);

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
                  fileType: (task.values[placeholder.index] as TaskValue)?.fileType || "document"
                }
              }
            }
          : task
      )
    );
  };

  const renderFilledTemplate = (values: { [key: string]: TaskValue | CarouselContent }) => {
    try {
      let content = JSON.parse(template.content);

      const fillContent = (item: any): any => {
        if (Array.isArray(item.content)) {
          return { ...item, content: item.content.map(fillContent) };
        } else if (item.type && item.type.startsWith("dynamic")) {
          const placeholder = placeholders.find((p) => p.name === item.name);
          if (placeholder) {
            // Handle carousel content
            if (item.type === "dynamicCarousel") {
              const carouselValue = values[placeholder.index] as CarouselContent;
              return {
                ...item,
                content: {
                  ...item.content,
                  ...carouselValue,
                }
              };
            }

            // Handle other dynamic types
            if (item.type === "dynamicText") {
              const textContent = (values[placeholder.index] as TaskValue)?.content || {{${placeholder.type}}};
              return {
                ...item,
                content: {
                  ...item.content,
                  src: textContent,
                  innerText: textContent,
                },
              };
            } else if (item.type === "dynamicUpload") {
              const fileType = (values[placeholder.index] as TaskValue)?.fileType || "document";
              if (fileType === "document") {
                const textContent = (values[placeholder.index] as TaskValue)?.content || {{${placeholder.type}}};
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
              const dynamicType = dynamic${fileType.charAt(0).toUpperCase()}${fileType.slice(1)};
              return {
                ...item,
                type: dynamicType,
                content: {
                  ...item.content,
                  src: (values[placeholder.index] as TaskValue)?.content || {{${placeholder.type}}},
                },
              };
            } else {
              return {
                ...item,
                content: {
                  ...item.content,
                  src: (values[placeholder.index] as TaskValue)?.content || {{${placeholder.type}}},
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
        description: "Failed to render filled template. Please check the input values.",
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
              description: "The number of columns in the CSV does not match the number of placeholders in the template.",
              variant: "destructive",
            });
            return;
          }

          const newTasks = (results.data as string[][])
            .slice(1)
            .filter(row => row.some(cell => cell.trim())) // Skip empty rows
            .map((row, index) => {
              const values: { [key: string]: TaskValue | CarouselContent } = {};
              
              placeholders.forEach((placeholder, i) => {
                if (placeholder.type === "carousel") {
                  // Parse carousel data from CSV
                  try {
                    const carouselData = JSON.parse(row[i]);
                    values[placeholder.index] = {
                      ...carouselData,
                      slides: carouselData.slides.map((slide: any) => ({
                        type: slide.type || "text",
                        innerText: slide.innerText || "",
                        src: slide.src || ""
                      }))
                    };
                  } catch {
                    // If parsing fails, maintain template structure with empty content
                    const templateContent = JSON.parse(template.content);
                    const carouselElement = templateContent.find(
                      (item: any) => item.name === placeholder.name && item.type === "dynamicCarousel"
                    );
                    values[placeholder.index] = {
                      ...carouselElement?.content,
                      slides: carouselElement?.content?.slides.map((slide: any) => ({
                        ...slide,
                        innerText: "",
                        src: ""
                      }))
                    };
                  }
                } else {
                  values[placeholder.index] = {
                    content: row[i] || "",
                    fileType: "document"
                  };
                }
              });

              return {
                id: index + 1,
                values
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
              name: ${project.name} - ${template.name} - Task${task.id},
              content: filled,
              timer: template.timer,
              annotator: annotator._id,
              reviewer: "",
            };
            filledTasks.push(newTask);
          });

          repeatTasks.push({
            project: project._id,
            name: ${project.name} - ${template.name} - Task${task.id},
            content: filled,
            timer: template.timer,
            annotator: null,
            reviewer: "",
          });
        } else {
          for (let i = 0; i < globalRepeat; i++) {
            filledTasks.push({
              project: project._id,
              name: ${project.name} - ${template.name} - Task${task.id}.${i + 1},
              content: filled,
              timer: template.timer,
              reviewer: "",
            });
          }
        }
      });

      const response = (await createTasks(filledTasks)) as unknown as CreateTasksResponse;

      let repeatresponse: SaveTasksResponse | undefined;
      if (assignToAllAnnotators) {
        repeatresponse = (await saveRepeatTasks(repeatTasks)) as unknown as SaveTasksResponse;
        if (!repeatresponse?.success) {
          throw new Error("Failed to save repeat tasks");
        }
      }

      if (assignToAllAnnotators && response?.success && repeatresponse?.success) {
        const assignments = response.tasks
          .filter((task) => task.annotator)
          .map((task) => handleAssignUser(task.annotator!, task._id, false));

        await Promise.all(assignments);
      }

      toast({
        title: "Tasks created successfully",
        description: Created ${filledTasks.length} tasks${repeatTasks.length ? ` and ${repeatTasks.length} repeat tasks : ''} successfully`,
      });

      setTasks([{ id: 1, values: {} }]);
      setGlobalRepeat(1);
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
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogContent className="sm:max-w-[425px] md:max-w-fit">
        <DialogHeader className="flex flex-col gap-4">
          <div className="flex flex-row items-center justify-between pr-8">
            <DialogTitle className="flex-1">Ingest Data</DialogTitle>
            <div className="flex items-center gap-2 ml-4">
              <label htmlFor="global-repeat" className="text-sm font-medium text-gray-700">
                Repeat Each Task:
              </label>
              <Input
                id="global-repeat"
                type="number"
                min="1"
                value={globalRepeat}
                onChange={(e) => handleGlobalRepeatChange(parseInt(e.target.value, 10))}
                className="w-20"
                disabled={assignToAllAnnotators}
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              checked={assignToAllAnnotators}
              onCheckedChange={handleAnnotatorAssignmentToggle}
            />
            <label className="text-sm font-medium text-gray-700">
              Assign to all annotators ({annotators.length} annotators)
            </label>
          </div>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          {tasks.map((task) => (
            <div key={task.id} className="mb-4 p-2 border rounded">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">Task {task.id}</h3>
                {tasks.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveTask(task.id)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {placeholders.map((placeholder) => (
                <div key={placeholder.index} className="mb-2">
                  <label
                    htmlFor={${task.id}-${placeholder.index}}
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
  );

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
                  content: (task.values[placeholder.index] as TaskValue)?.content || "",
                  fileType
                }
              }
            }
          : task
      )
    );
  };

  const renderPlaceholderInput = (task: Task, placeholder: Placeholder) => {
    // Handle carousel placeholder
    if (placeholder.type === "carousel") {
      // Extract carousel properties from template
      const templateContent = JSON.parse(template.content);
      const carouselElement = templateContent.find(
        (item: any) => item.name === placeholder.name && item.type === "dynamicCarousel"
      );
      
      const carouselProperties = carouselElement?.content || {
        slides: [{ type: "text", innerText: "" }],
        keyboardNav: true,
        autoSlide: false,
        slideInterval: 5000
      };

      // Use the existing slides structure from the template
      const currentSlides = (task.values[placeholder.index] as CarouselContent)?.slides || 
        carouselProperties.slides.map(slide => ({
          ...slide,
          innerText: "",
          src: ""
        }));

      return (
        <div className="border rounded p-4 space-y-4">
          <h4 className="text-lg font-semibold">Carousel Content for {placeholder.name}</h4>
          
          {currentSlides.map((slide, index) => (
            <div key={index} className="mb-4 p-2 border rounded">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Slide {index + 1} ({slide.type})
                </label>
              </div>

              {slide.type === "text" && (
                <Input
                  value={slide.innerText || ''}
                  onChange={(e) => {
                    setTasks(prevTasks => 
                      prevTasks.map(t => 
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
                                  )
                                }
                              }
                            }
                          : t
                      )
                    );
                  }}
                  placeholder={Enter text for Slide ${index + 1}}
                  className="w-full"
                />
              )}

              {(slide.type === "image" || slide.type === "video") && (
                <Input
                  value={slide.src || ''}
                  onChange={(e) => {
                    setTasks(prevTasks => 
                      prevTasks.map(t => 
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
                                  )
                                }
                              }
                            }
                          : t
                      )
                    );
                  }}
                  placeholder={Enter ${slide.type} URL for Slide ${index + 1}}
                  className="w-full"
                />
              )}
            </div>
          ))}
        </div>
      );
    }

    // Handle other placeholder types
    if (placeholder.type === "upload") {
      return (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              id={${task.id}-${placeholder.index}}
              value={(task.values[placeholder.index] as TaskValue)?.content || ""}
              onChange={(e) => handleInputChange(task.id, placeholder, e.target.value)}
              placeholder={Enter file URL for ${placeholder.name}}
              className="flex-1"
            />
            <Select
              value={(task.values[placeholder.index] as TaskValue)?.fileType || "document"}
              onValueChange={(value: "image" | "video" | "document" | "audio") =>
                handleFileTypeChange(task.id, placeholder, value)
              }
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

    // Default input for other types
    return (
      <Input
        id={${task.id}-${placeholder.index}}
        value={(task.values[placeholder.index] as TaskValue)?.content || ""}
        onChange={(e) => handleInputChange(task.id, placeholder, e.target.value)}
        placeholder={Enter ${placeholder.type} content for ${placeholder.name}}
      />
    );
  };