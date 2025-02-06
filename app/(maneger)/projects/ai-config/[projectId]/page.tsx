"use client"

import { addModel, deleteModel, toggleModel, updateModel } from "@/app/actions/aiModel"
import { getATemplate } from "@/app/actions/template"
import { SheetMenu } from "@/components/admin-panel/sheet-menu"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { extractElementNames } from "@/lib/constants"
import { Bot, Cpu, Settings, Trash2 } from "lucide-react"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"

export interface Judge {
  _id: string
  model: string
  provider: string
  name: string
  enabled: boolean
  apiKey: string
  systemPrompt: string
}

export default function Component() {
  const [judges, setJudges] = useState<Judge[]>([])
  const [editingJudge, setEditingJudge] = useState<Judge | null>(null)
  const pathName = usePathname()
  const projectId = pathName.split("/")[3]
  const [selectedModel, setSelectedModel] = useState<string>("")
  const [name, setName] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [systemPrompt, setSystemPrompt] = useState("")
  const [addDialogOpen, setAddDialogOpen] = useState<string | null>(null)
  const [elements, setElements] = useState<string[]>([])

  async function extract() {
    const task = await getATemplate(projectId)
    setElements(extractElementNames(JSON.parse(JSON.parse(task).content)))
  }

  useEffect(() => {
    const fetchJudges = async () => {
      const res = await fetch(`/api/aiModel?projectId=${projectId}`)
      const judges = await res.json()
      if (judges.error) {
        toast.error(judges.error)
        return
      }
      setJudges(judges.models)
      extract()
    }
    fetchJudges()
  }, [projectId])

  const handleSubmit = async (provider: string) => {
    if (!selectedModel || !apiKey || !systemPrompt) {
      toast.error("Please fill in all fields")
      return
    }
    const res = await addModel(provider, projectId, selectedModel, apiKey, systemPrompt, name)
    if (res.error) {
      toast.error(res.error)
      return
    }
    setAddDialogOpen(null)
    setJudges([...judges, JSON.parse(res?.model as string)])
    setApiKey("")
    setName("")
    setSystemPrompt("")
    setSelectedModel("")
  }

  const toggleJudge = async (id: string, enabled: boolean) => {
    const res = await toggleModel(id, enabled)
    if (res.error) {
      toast.error(res.error)
      return
    }
    setJudges(
      judges.map((judge) => (judge._id === id ? { ...judge, enabled: !judge.enabled } : judge))
    )
    setEditingJudge(prev => prev ? { ...prev, enabled: !prev.enabled } : null)
  }

  const removeJudge = async (id: string) => {
    const res = await deleteModel(id)
    if (res.error) {
      toast.error(res.error)
      return
    }
    setJudges(judges.filter((judge) => judge._id !== id))
    setEditingJudge(null)
  }

  const updateJudge = (id: string, updates: Partial<Judge>) => {
    setJudges(
      judges.map((judge) => (judge._id === id ? { ...judge, ...updates } : judge))
    )
  }

  const saveJudgeEdits = async () => {
    if (editingJudge) {
      const model = await updateModel({
        id: editingJudge._id,
        provider: editingJudge.provider,
        model: editingJudge.model,
        apiKey: editingJudge.apiKey,
        systemPrompt: editingJudge.systemPrompt,
      })

      if (model.error) {
        toast.error(model.error)
        return
      }
      updateJudge(editingJudge._id, JSON.parse(model.model as string))
      setEditingJudge(null)
    }
  }

  const providerModels = {
    OpenAI: ["gpt-4", "gpt-4-turbo", "gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"],
    Anthropic: ["claude-3-5-sonnet-latest", "claude-3-5-sonnet-20240620", "claude-3-haiku-20240307", "claude-3-opus-latest", "claude-3-opus-20240229"],
    Gemini: ["gemini-1.0-pro", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"],
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <div className="flex justify-between">
          <h2 className="text-xl font-semibold mb-4">Configured Expert</h2>
          <SheetMenu />
        </div>
        {judges.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-6 text-center">
              <Bot className="w-12 h-12 mb-4 text-muted-foreground" />
              <CardTitle className="mb-2">No AI Experts Configured</CardTitle>
              <CardDescription className="mb-4">
                Add your first AI Expert to start evaluating AI models.
              </CardDescription>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {judges.map((judge) => (
              <Dialog key={judge._id} open={editingJudge?._id === judge._id} onOpenChange={(open) => {
                if (open) {
                  setEditingJudge({ ...judge })
                } else {
                  setEditingJudge(null)
                }
              }}>
                <DialogTrigger asChild>
                  <div className="flex items-center justify-between p-4 rounded-lg border bg-card cursor-pointer hover:bg-accent hover:text-accent-foreground">
                    <div className="flex items-center gap-3">
                      <Bot className="w-5 h-5" />
                      <div>
                        <div className="font-medium">{judge.name}</div>
                        <div className="text-xs text-muted-foreground mt-1 truncate max-w-[210px] sm:max-w-[350px] md:max-w-[500px] lg:max-w-[600px]">
                          {judge.systemPrompt}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${judge.enabled
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-700"
                        }`}
                    >
                      {judge.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Configure {judge.model}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="model">Model</Label>
                      <Select
                        value={editingJudge?.model || ""}
                        onValueChange={(e) => setEditingJudge(prev => prev ? { ...prev, model: e } : null)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a model" />
                        </SelectTrigger>
                        <SelectContent>
                          {providerModels[judge.provider as keyof typeof providerModels].map((model) => (
                            <SelectItem key={model} value={model}>
                              {model}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="apiKey">API Key</Label>
                      <Input
                        id="apiKey"
                        type="password"
                        value={editingJudge?.apiKey || ""}
                        onChange={(e) => setEditingJudge(prev => prev ? { ...prev, apiKey: e.target.value } : null)}
                        placeholder={`Enter your ${judge.provider} API key`}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="systemPrompt">System Prompt</Label>
                      <Textarea
                        id="systemPrompt"
                        value={editingJudge?.systemPrompt || ""}
                        onChange={(e) => setEditingJudge(prev => prev ? { ...prev, systemPrompt: e.target.value } : null)}
                        placeholder="Enter the system prompt for the judge"
                        rows={4}
                      />
                      <div>
                        {elements.map((element, index) => (
                          <Badge key={index} variant="outline" onClick={() => setEditingJudge(prev => prev ? { ...prev, systemPrompt: prev.systemPrompt + ` {${element}}` } : null)} className="mr-2 hover:cursor-pointer">{element}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        onClick={() => removeJudge(judge._id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove
                      </Button>
                      <Button
                        className="w-full"
                        onClick={saveJudgeEdits}
                      >
                        Save Changes
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          toggleJudge(judge._id, !judge.enabled)
                        }}
                      >
                        {editingJudge?.enabled ? "Disable" : "Enable"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            ))}
          </div>
        )}
      </div>

      <h2 id="add-judge-section" className="text-xl font-semibold mb-4">Configure Automated AI Expert</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          {
            name: "OpenAI",
            description: "Configure a ChatGPT model as an AI Expert",
            icon: <Bot className="w-6 h-6" />,
            bgClass: "bg-gradient-to-br from-blue-500 to-purple-600",
          },
          {
            name: "Anthropic",
            description: "Configure Claude model as an AI Expert",
            icon: <Cpu className="w-6 h-6" />,
            bgClass: "bg-gradient-to-br from-orange-500 to-pink-600",
          },
          {
            name: "Gemini",
            description: "Configure a Google Gemini model as an AI Expert",
            icon: <Settings className="w-6 h-6" />,
            bgClass: "bg-gradient-to-br from-teal-500 to-blue-600",
          },
        ].map((provider) => (
          <Dialog key={provider.name} open={provider.name === addDialogOpen} onOpenChange={(open) => setAddDialogOpen(open ? provider.name : null)}>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div
                    className={`w-12 h-12 rounded-lg ${provider.bgClass} text-white flex items-center justify-center mb-4`}
                  >
                    {provider.icon}
                  </div>
                  <CardTitle className="mb-2">{provider.name}</CardTitle>
                  <CardDescription>{provider.description}</CardDescription>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Configure {provider.name} AI Expert</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={`Enter a name for your AI Expert`}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Select
                    value={selectedModel}
                    onValueChange={setSelectedModel}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                      {providerModels[provider.name as keyof typeof providerModels].map((model) => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={`Enter your ${provider.name} API key`}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="systemPrompt">System Prompt</Label>

                  <Textarea
                    id="systemPrompt"
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    placeholder="Enter the system prompt for the judge"
                    rows={4}
                  />
                  <div>
                    {elements.map((element, index) => (
                      <Badge key={index} variant="outline" onClick={() => setSystemPrompt(prev =>  prev + ` {${element}}` )} className="mr-2 hover:cursor-pointer">{element}</Badge>
                    ))}
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => handleSubmit(provider.name)}
                  disabled={!apiKey || !selectedModel}
                >
                  Add AI Expert
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        ))}
      </div>
    </div>
  )
}