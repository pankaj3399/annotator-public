import React, { useState } from "react";
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
import { Bot, Brain, Upload, LucideIcon } from "lucide-react";
import { Task } from "./taskDialog";
import { Placeholder } from "./taskDialog";
import { Badge } from "./ui/badge";

type Provider = "OpenAI" | "Anthropic" | "Gemini";

interface FormValues {
  model: string;
  provider: Provider | "";
  apiKey: string;
  systemPrompt: string;
}

interface AIProvider {
  name: Provider;
  icon: LucideIcon;
  description: string;
  color: string;
}

interface AIModalProps {
  onConfigure: (
    provider: string,
    model: string,
    systemPrompt: string,
    apiKey: string,
    placeholder: any,
    number: any
  ) => Promise<void>;
  isAIModalOpen: boolean;
  setIsAIModalOpen: (isOpen: boolean) => void;
  tasks: Task[];
  placeholders: Placeholder[];
  selectedPlaceholder: Placeholder | any;
  setSelectedPlaceholder: (placeholder: Placeholder | any) => void;
  numberOfTasks: number;
  setNumberOfTasks: (number: number) => void;
}

const providerModels: Record<Provider, string[]> = {
  OpenAI: ["gpt-4", "gpt-4-turbo", "gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"],
  Anthropic: [
    "claude-3-5-sonnet-latest",
    "claude-3-5-sonnet-20240620",
    "claude-3-haiku-20240307",
    "claude-3-opus-latest",
    "claude-3-opus-20240229",
  ],
  Gemini: [
    "gemini-1.0-pro",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-pro",
  ],
};

const aiProviders: AIProvider[] = [
  {
    name: "Anthropic",
    icon: Bot,
    description: "Advanced AI for complex tasks",
    color: "bg-purple-500",
  },
  {
    name: "OpenAI",
    icon: Brain,
    description: "Versatile language models",
    color: "bg-green-500",
  },
  {
    name: "Gemini",
    icon: Upload,
    description: "Multi-modal AI capabilities",
    color: "bg-blue-500",
  },
];

const MultiAIModal: React.FC<AIModalProps> = ({
  onConfigure,
  isAIModalOpen,
  setIsAIModalOpen,
  tasks,
  placeholders,
  selectedPlaceholder,
  setSelectedPlaceholder,
  numberOfTasks,
  setNumberOfTasks,
}) => {
  const [formValues, setFormValues] = useState<FormValues>({
    model: "",
    provider: "",
    apiKey: "",
    systemPrompt: "",
  });

  const handleProviderChange = (value: string) => {
    setFormValues((prev) => ({
      ...prev,
      provider: value as Provider,
      model: "",
    }));
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleModelChange = (value: string) => {
    setFormValues((prev) => ({ ...prev, model: value }));
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
      const placeholderPattern = new RegExp(`{{${placeholder.name}}}`, "g");
      let valuesString = "";

      tasks.forEach((task, index) => {
        const valueIndex = placeholder.index;
        // @ts-ignore
        const valueContent = task.values[valueIndex]?.content || ""; // Default to empty string
        valuesString += `\`${index + 1}. ${valueContent}\` `;
      });

      resolvedPrompt = resolvedPrompt.replace(
        placeholderPattern,
        valuesString.trim()
      );
    });

    console.log(resolvedPrompt);

    return resolvedPrompt;
  };

  const handleSubmit = async () => {
    if (formValues.provider && formValues.model && formValues.apiKey) {
      const resolvedPrompt = resolveSystemPrompt();
      await onConfigure(
        formValues.provider,
        formValues.model,
        resolvedPrompt,
        formValues.apiKey,
        selectedPlaceholder,
        numberOfTasks
      );
      resetAndClose();
    }
  };

  const resetAndClose = () => {
    // setIsAIModalOpen(false);
    setFormValues({
      model: "",
      provider: "",
      apiKey: "",
      systemPrompt: "",
    });
    setSelectedPlaceholder({});
  };

  const isSubmitDisabled =
    !formValues.provider || !formValues.model || !formValues.apiKey;

  const getAvailableModels = (provider: Provider | ""): string[] => {
    if (!provider || !(provider in providerModels)) return [];
    return providerModels[provider as Provider];
  };

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
            <label className="text-sm font-medium">AI Provider</label>
            <Select
              value={formValues.provider}
              onValueChange={handleProviderChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an AI provider" />
              </SelectTrigger>
              <SelectContent>
                {aiProviders.map((provider) => {
                  const Icon = provider.icon;
                  return (
                    <SelectItem key={provider.name} value={provider.name}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span>{provider.name}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Model Version</label>
            <Select
              value={formValues.model}
              onValueChange={handleModelChange}
              disabled={!formValues.provider}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {getAvailableModels(formValues.provider).map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">API Key</label>
            <Input
              placeholder="Enter your API key"
              name="apiKey"
              type="password"
              value={formValues.apiKey}
              onChange={handleInputChange}
              disabled={!formValues.provider}
            />
          </div>

          <div className="flex items-center space-x-2 w-full max-w-md">
            <Select onValueChange={setSelectedPlaceholder}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Placeholder" />
              </SelectTrigger>
              <SelectContent>
                {placeholders.map((p) => (
                  <SelectItem key={p.index} value={p as any}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="number"
              placeholder="# of Tasks"
              className="w-[100px]"
              value={numberOfTasks}
              onChange={(e) => setNumberOfTasks(parseInt(e.target.value))}
            />
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
                  className="cursor-pointer"
                  onClick={() => handleBadgeClick(placeholder.name)}
                >
                  {placeholder.name}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={resetAndClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitDisabled}>
            Configure {formValues.provider || "AI Model"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MultiAIModal;
