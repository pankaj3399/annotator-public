"use client";

import { createTasks } from "@/app/actions/task";
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
import { toast } from "@/hooks/use-toast";
import { Minus, Plus, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { updateTestTemplate } from "@/app/actions/template";
import Papa from "papaparse";

interface Task {
  id: number;
  values: { [key: string]: string };
}

interface Placeholder {
  type: "text" | "video" | "img" | "audio";
  index: number;
  name: string;
}

interface FilledTask {
  project: string;
  name: string;
  content: string;
  timer: number;
  annotator?: string;
  reviewer: string; // Add this required field
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
          let type: "text" | "video" | "img" | "audio";
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
          ? { ...task, values: { ...task.values, [placeholder.index]: value } }
          : task
      )
    );
  };

  const handleGlobalRepeatChange = (value: number) => {
    if (!assignToAllAnnotators) {
      setGlobalRepeat(Math.max(1, value));
    }
  };

  const renderFilledTemplate = (values: { [key: string]: string }) => {
    try {
      let content = JSON.parse(template.content);

      const fillContent = (item: any): any => {
        if (Array.isArray(item.content)) {
          return { ...item, content: item.content.map(fillContent) };
        } else if (item.type && item.type.startsWith("dynamic")) {
          const placeholder = placeholders.find((p) => p.name === item.name);
          if (placeholder) {
            if (item.type === "dynamicText") {
              return {
                ...item,
                content: {
                  ...item.content,
                  innerText:
                    values[placeholder.index] || `{{${placeholder.type}}}`,
                },
              };
            } else {
              return {
                ...item,
                content: {
                  ...item.content,
                  src: values[placeholder.index] || `{{${placeholder.type}}}`,
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
                    row[i] || "",
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

      // For each task
      tasks.forEach((task) => {
        const filled = renderFilledTemplate(task.values);

        // If assigning to all annotators
        if (assignToAllAnnotators) {
          annotators.forEach((annotator, index) => {
            filledTasks.push({
              project: project._id,
              name: `${project.name} - ${template.name} - Task${task.id}`,
              content: filled,
              timer: template.timer,
              annotator: annotator._id,
              reviewer: "", // Add empty string as default reviewer
            });
          });
        } else {
          // Create globalRepeat number of copies without specific assignment
          for (let i = 0; i < globalRepeat; i++) {
            filledTasks.push({
              project: project._id,
              name: `${project.name} - ${template.name} - Task${task.id}.${
                i + 1
              }`,
              content: filled,
              timer: template.timer,
              reviewer: "", // Add empty string as default reviewer
            });
          }
        }
      });

      const response = (await createTasks(
        filledTasks
      )) as unknown as CreateTasksResponse;

      // If tasks were created successfully and we're using annotator assignment
      if (assignToAllAnnotators && response?.success) {
        const assignments = response.tasks
          .filter((task) => task.annotator)
          .map((task) =>
            handleAssignUser(
              task.annotator!,
              task._id,
              false // not AI
            )
          );

        // Wait for all assignments to complete
        await Promise.all(assignments);
      }

      toast({
        title: "Tasks created successfully",
        description: `Created ${filledTasks.length} tasks successfully`,
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
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveTask(task.id)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </div>
              {placeholders.map((placeholder) => (
                <div key={placeholder.index} className="mb-2">
                  <label
                    htmlFor={`${task.id}-${placeholder.index}`}
                    className="block text-sm font-medium text-gray-700"
                  >
                    {placeholder.name} ({placeholder.type})
                  </label>
                  <Input
                    id={`${task.id}-${placeholder.index}`}
                    value={task.values[placeholder.index] || ""}
                    onChange={(e) =>
                      handleInputChange(task.id, placeholder, e.target.value)
                    }
                    placeholder={`Enter ${placeholder.type} content for ${placeholder.name}`}
                  />
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
}
