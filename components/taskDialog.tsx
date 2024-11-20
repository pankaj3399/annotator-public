"use client";

import { createTasks } from "@/app/actions/task";
import { Project } from "@/app/(maneger)/page";
import { template } from "@/app/template/page";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Minus, Plus, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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

export function TaskDialog({
  template,
  isDialogOpen,
  setIsDialogOpen,
  project,
}: {
  template: template;
  isDialogOpen: boolean;
  setIsDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  project: Project;
}) {
  const [placeholders, setPlaceholders] = useState<Placeholder[]>([]);
  const [tasks, setTasks] = useState<Task[]>([{ id: 1, values: {} }]);
  const [globalRepeat, setGlobalRepeat] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setGlobalRepeat(Math.max(1, value));
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
    const filledTasks: {
      project: string;
      name: string;
      content: string;
      timer: number;
    }[] = [];

    // For each task
    tasks.forEach((task, taskIndex) => {
      const filled = renderFilledTemplate(task.values);
      // Create globalRepeat number of copies
      for (let i = 0; i < globalRepeat; i++) {
        filledTasks.push({
          project: project._id,
          name: `${project.name} - ${template.name} - ${taskIndex + 1}.${
            i + 1
          }`,
          content: filled,
          timer: template.timer,
        });
      }
    });

    try {
      await createTasks(filledTasks);
      toast({
        title: "Tasks created successfully",
        description: `Created ${filledTasks.length} tasks successfully`,
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
        <DialogHeader className="flex flex-row items-center justify-between pr-8">
          {" "}
          {/* Added pr-8 for close button space */}
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
            />
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
