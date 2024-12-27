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
import { motion } from "framer-motion";
import { ArrowLeft, Bot, Brain, Upload } from "lucide-react";
import { addModel } from "@/app/actions/aiModel";
import { usePathname } from "next/navigation";

const AIModal = ({ isAIModalOpen, setIsAIModalOpen }) => {
  const [step, setStep] = useState(1);
  const [selectedAI, setSelectedAI] = useState("");
  const [availableModels, setAvailableModels] = useState([]);
  const [formValues, setFormValues] = useState({
    name: "",
    model: "",
    provider: "",
    apiKey: "",
  });

  const providerModels = {
    OpenAI: ["gpt-4", "gpt-4-turbo", "gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"],
    Anthropic: ["claude-3-5-sonnet-latest", "claude-3-5-sonnet-20240620", "claude-3-haiku-20240307", "claude-3-opus-latest", "claude-3-opus-20240229"],
    Gemini: ["gemini-1.0-pro", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"],
  };
  const pathName = usePathname();
  const projectId = pathName.split("/")[2];


  const aiProviders = [
    {
      name: "Claude",
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

  const handleAISelection = (aiProvider) => {
    setSelectedAI(aiProvider);
    setFormValues({ ...formValues, provider: aiProvider, model: "" });
    setAvailableModels(providerModels[aiProvider]);
    setStep(2);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormValues({ ...formValues, [name]: value });
  };

  const handleSubmit = async () => {
    const res = await addModel(formValues.provider,projectId,formValues.model,formValues.apiKey,formValues.name)
    console.log(res)
    resetAndClose();
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
    setAvailableModels([]);
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
              {aiProviders.map((provider) => (
                <button
                  key={provider.name}
                  onClick={() => handleAISelection(provider.name)}
                  className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
                >
                  <div className={`p-2 rounded-lg ${provider.color}`}>
                    <provider.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold">{provider.name}</h3>
                    <p className="text-sm text-gray-500">{provider.description}</p>
                  </div>
                </button>
              ))}
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
                <select
                  name="model"
                  value={formValues.model}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                >
                  <option value="">Select a model</option>
                  {availableModels.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
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
            <Button onClick={handleSubmit}>
              Configure {selectedAI}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AIModal;
