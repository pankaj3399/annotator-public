import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bot, Brain, Upload, LucideIcon, Loader2 } from "lucide-react";
import { Task } from "./taskDialog";
import { Placeholder } from "./taskDialog";
import { Badge } from "./ui/badge";
import { getProviderAIModels } from "@/app/actions/providerAIModel";

type Provider = "OpenAI" | "Anthropic" | "Gemini";

interface FormValues {
  modelId: string;
  systemPrompt: string;
}

interface SavedAIModel {
  id: string;
  name: string;
  provider: string;
  model: string;
  apiKey: string;
  systemPrompt?: string;
}

interface AIModalProps {
  onConfigure: (
    provider: string,
    model: string,
    systemPrompt: string,
    apiKey: string
  ) => Promise<void>;
  isAIModalOpen: boolean;
  setIsAIModalOpen: (isOpen: boolean) => void;
  tasks: Task[];
  placeholders: Placeholder[];
}

// Icons for providers
const getProviderIcon = (provider: string): LucideIcon => {
  switch (provider.toLowerCase()) {
    case "anthropic":
      return Bot;
    case "openai":
      return Brain;
    case "gemini":
      return Upload;
    default:
      return Bot;
  }
};

const AIModal: React.FC<AIModalProps> = ({
  onConfigure,
  isAIModalOpen,
  setIsAIModalOpen,
  tasks,
  placeholders,
}) => {
  const [formValues, setFormValues] = useState<FormValues>({
    modelId: "",
    systemPrompt: "",
  });
  const [savedModels, setSavedModels] = useState<SavedAIModel[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingModels, setIsLoadingModels] = useState<boolean>(true);

  // Fetch saved AI models when modal opens
  useEffect(() => {
    if (isAIModalOpen) {
      fetchSavedModels();
    }
  }, [isAIModalOpen]);

  const fetchSavedModels = async () => {
    setIsLoadingModels(true);
    try {
      const response = await getProviderAIModels();
      if (response.success && response.models) {
        setSavedModels(response.models);
      } else {
        console.error("Failed to fetch models:", response.error);
      }
    } catch (error) {
      console.error("Error fetching AI models:", error);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleModelChange = (modelId: string) => {
    const selectedModel = savedModels.find(model => model.id === modelId);
    
    setFormValues(prev => ({
      ...prev,
      modelId,
      // Pre-populate with the saved system prompt if it exists
      systemPrompt: selectedModel?.systemPrompt || prev.systemPrompt
    }));
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleBadgeClick = (placeholderName: string) => {
    setFormValues((prev) => ({
      ...prev,
      systemPrompt: prev.systemPrompt
        ? `${prev.systemPrompt} {{${placeholderName}}}`
        : `{{${placeholderName}}}`,
    }));
  };

  const resolveSystemPrompt = (): string => {
    let resolvedPrompt = formValues.systemPrompt;

    placeholders.forEach((placeholder) => {
      const valueIndex = placeholder.index;
      // @ts-ignore
      const valueContent = tasks[0]?.values[valueIndex]?.content || ""; // Default to empty string
      const placeholderPattern = new RegExp(`{{${placeholder.name}}}`, "g");
      resolvedPrompt = resolvedPrompt.replace(placeholderPattern, valueContent);
    });

    return resolvedPrompt;
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const selectedModel = savedModels.find(model => model.id === formValues.modelId);
      
      if (selectedModel) {
        const resolvedPrompt = resolveSystemPrompt();
        await onConfigure(
          selectedModel.provider,
          selectedModel.model,
          resolvedPrompt,
          selectedModel.apiKey
        );
        resetAndClose();
      }
    } catch (error) {
      console.error("Error during configuration:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetAndClose = () => {
    setIsAIModalOpen(false);
    setFormValues({
      modelId: "",
      systemPrompt: "",
    });
  };

  const isSubmitDisabled = !formValues.modelId;

  return (
    <Dialog open={isAIModalOpen} onOpenChange={setIsAIModalOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Configure AI Model
          </DialogTitle>
        </DialogHeader>

        <div className="py-6 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">AI Model</label>
            {isLoadingModels ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                <span className="ml-2 text-sm text-gray-500">Loading models...</span>
              </div>
            ) : savedModels.length === 0 ? (
              <div className="text-sm text-gray-500 py-2">
                No saved AI models found. Please configure models in your settings.
              </div>
            ) : (
              <Select
                value={formValues.modelId}
                onValueChange={handleModelChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a saved AI model" />
                </SelectTrigger>
                <SelectContent>
                  {savedModels.map((model) => {
                    const Icon = getProviderIcon(model.provider);
                    return (
                      <SelectItem key={model.id} value={model.id}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <div className="flex flex-col">
                            <span>{model.name}</span>
                            <span className="text-xs text-gray-500">
                              {model.provider} | {model.model}
                            </span>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">System Prompt</label>
            <Textarea
              placeholder="Enter system prompt"
              name="systemPrompt"
              value={formValues.systemPrompt}
              onChange={handleInputChange}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Available Placeholders
            </label>
            <div className="flex flex-wrap gap-2">
              {placeholders.map((placeholder) => (
                <Badge
                  key={placeholder.index}
                  variant="outline"
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => handleBadgeClick(placeholder.name)}
                >
                  {placeholder.name}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={resetAndClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitDisabled || isLoading}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </div>
            ) : (
              'Use Selected Model'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AIModal;