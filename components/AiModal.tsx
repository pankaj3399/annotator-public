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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Bot, Brain, Upload, LucideIcon } from "lucide-react";
import { addModel } from "@/app/actions/aiModel";
import { usePathname } from "next/navigation";

type Provider = "OpenAI" | "Anthropic" | "Gemini"

interface FormValues {
  name: string;
  model: string;
  provider: Provider | "";
  apiKey: string;
}

interface AIProvider {
  name: Provider;
  icon: LucideIcon;
  description: string;
  color: string;
}

interface AIModalProps {
  onConfigure:(projectId:string)=>void
  isAIModalOpen: boolean;
  setIsAIModalOpen: (isOpen: boolean) => void;
}

const providerModels: Record<Provider, string[]> = {
  OpenAI: ["gpt-4", "gpt-4-turbo", "gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"],
  Anthropic: ["claude-3-5-sonnet-latest", "claude-3-5-sonnet-20240620", "claude-3-haiku-20240307", "claude-3-opus-latest", "claude-3-opus-20240229"],
  Gemini: ["gemini-1.0-pro", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"],
};

const AIModal: React.FC<AIModalProps> = ({ 
  onConfigure,isAIModalOpen, setIsAIModalOpen }) => {
  const [step, setStep] = useState(1);
  const [selectedAI, setSelectedAI] = useState<Provider | "">("");
  const [formValues, setFormValues] = useState<FormValues>({
    name: "",
    model: "",
    provider: "",
    apiKey: "",
  });

    const pathName = usePathname();
    const projectId = pathName.split("/")[2];

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

  const handleAISelection = (aiProvider: Provider) => {
    setSelectedAI(aiProvider);
    setFormValues((prev) => ({
      ...prev,
      provider: aiProvider,
      model: "",
    }));
    setStep(2);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleModelChange = (value: string) => {
    setFormValues((prev) => ({ ...prev, model: value }));
  };

  const handleSubmit = async () => {
    if (!formValues.provider || !projectId) return;

    try {
      const res = await addModel(
        formValues.provider,
        projectId,
        formValues.model,
        formValues.apiKey,
        formValues.name
      );
      resetAndClose();
      onConfigure(projectId)
    } catch (error) {
      console.error("nError adding model:", error);
    }
  };

  const resetAndClose = () => {
    setIsAIModalOpen(false);
    setStep(1);
    setSelectedAI("");
    setFormValues({
      name: "",
      model: "",
      provider: "",
      apiKey: "",
    });
  };

  const isSubmitDisabled = !formValues.name || !formValues.model || !formValues.apiKey;

  const getAvailableModels = (provider: Provider | ""): string[] => {
    if (!provider || !(provider in providerModels)) return [];
    return providerModels[provider as Provider];
  };

  return (
    <Dialog open={isAIModalOpen} onOpenChange={resetAndClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            {step === 2 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setStep(1)}
                className="h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {step === 1 ? "Choose AI Provider" : "Configure AI Model"}
          </DialogTitle>
        </DialogHeader>

        <div className="py-6">
          {step === 1 ? (
            <div className="grid gap-4">
              {aiProviders.map((provider) => {
                const Icon = provider.icon;
                return (
                  <button
                    key={provider.name}
                    onClick={() => handleAISelection(provider.name)}
                    className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
                  >
                    <div className={`p-2 rounded-lg ${provider.color}`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold">{provider.name}</h3>
                      <p className="text-sm text-gray-500">{provider.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  placeholder="Enter model name"
                  name="name"
                  value={formValues.name}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Model Version</label>
                <Select
                  value={formValues.model}
                  onValueChange={handleModelChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableModels(selectedAI).map((model) => (
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
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={resetAndClose}>
            Cancel
          </Button>
          {step === 2 && (
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitDisabled}
            >
              Configure {selectedAI}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AIModal;