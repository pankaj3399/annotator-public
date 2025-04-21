'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { SheetMenu } from '@/components/admin-panel/sheet-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input'; // Keep Input for potential future use, though not used in edit now
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { extractElementNames } from '@/lib/constants';
import {
  deleteModel,
  importProviderModelToProject,
  toggleModel,
  updateModel,
} from '@/app/actions/aiModel';
import { getATemplate } from '@/app/actions/template';
import {
  Bot,
  Cpu,
  Settings,
  Trash2,
  Key,
  Import,
  Check,
  Shield,
  ExternalLink,
  Plus,
  Edit,
  Power,
  PowerOff,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

// Interface for the project-specific AI Model instance
export interface ProjectAIModel {
  _id: string;
  model: string; // e.g., 'gpt-4o'
  provider: string; // e.g., 'openai'
  name: string; // User-defined name for this instance (inherited from provider model)
  enabled: boolean;
  apiKey: string; // Note: This likely comes from the linked ProviderModel, not stored directly here? Check action logic.
  systemPrompt: string;
  projectId: string; // Added for clarity
  providerModelId: string; // Added for linking
}

// Interface for available provider models (fetched from /api/providerModels)
export interface ProviderModel {
  id: string;
  name: string;
  provider: string;
  model: string;
  apiKeyRef: string; // Reference to the key config
  systemPrompt?: string;
  userId: string;
}

export default function AIModelConfiguration() {
  const router = useRouter();
  const pathName = usePathname();
  const projectId = pathName.split('/')[3];

  // State for the single AI model configured for this project
  const [projectModel, setProjectModel] = useState<ProjectAIModel | null>(null);
  const [isProjectModelLoading, setIsProjectModelLoading] =
    useState<boolean>(true);

  // State for editing the current project model
  const [editingModel, setEditingModel] = useState<ProjectAIModel | null>(null);

  // State for template elements (for system prompt helper)
  const [elements, setElements] = useState<string[]>([]);

  // State for available provider models from user's config
  const [providerModels, setProviderModels] = useState<ProviderModel[]>([]);
  const [isProviderModelsLoading, setIsProviderModelsLoading] =
    useState<boolean>(false);

  // State for tracking which model is currently being added/set
  const [settingModelId, setSettingModelId] = useState<string | null>(null);

  // --- Data Fetching ---

  async function extractTemplateElements() {
    try {
      const task = await getATemplate(projectId);
      if (task) {
        setElements(extractElementNames(JSON.parse(JSON.parse(task).content)));
      }
    } catch (error) {
      console.error('Failed to extract template elements:', error);
      // Non-critical, don't need toast unless necessary
    }
  }

  // Fetch the current AI model configured for the project
  const fetchProjectModel = async () => {
    setIsProjectModelLoading(true);
    try {
      const res = await fetch(`/api/aiModel?projectId=${projectId}`);
      const data = await res.json();

      if (data.error) {
        toast.error(`Failed to load project AI config: ${data.error}`);
        setProjectModel(null);
      } else if (data.models && data.models.length > 0) {
        if (data.models.length > 1) {
          console.warn(
            'Multiple AI models found for project, using the first one.'
          );
          toast.warning(
            'Multiple AI models found, displaying the first. Consider cleaning up unused models via API if necessary.'
          );
        }
        setProjectModel(data.models[0]);
      } else {
        setProjectModel(null);
      }
    } catch (error) {
      console.error('Error fetching project model:', error);
      toast.error(
        "An error occurred while fetching the project's AI configuration."
      );
      setProjectModel(null);
    } finally {
      setIsProjectModelLoading(false);
    }
  };

  // Fetch available provider models configured by the user
  const fetchProviderModels = async () => {
    try {
      setIsProviderModelsLoading(true);
      const response = await fetch('/api/providerModels');
      if (!response.ok) throw new Error('Failed to fetch provider models');

      const result = await response.json();
      if (result.success) {
        setProviderModels(result.models || []);
      } else {
        toast.error(result.error || 'Failed to fetch provider models');
      }
    } catch (error) {
      console.error('Error fetching provider models:', error);
      toast.error('Failed to load available provider models');
    } finally {
      setIsProviderModelsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectModel();
    fetchProviderModels();
    extractTemplateElements();
  }, [projectId]);

  // --- Actions ---

  // Toggle the enabled state of the current project model
  const toggleProjectModel = async () => {
    if (!projectModel) return;

    const originalState = projectModel.enabled;
    // Optimistic UI update
    setProjectModel((prev) =>
      prev ? { ...prev, enabled: !prev.enabled } : null
    );

    const res = await toggleModel(projectModel._id, !originalState);
    if (res.error) {
      toast.error(
        `Failed to ${originalState ? 'disable' : 'enable'} model: ${res.error}`
      );
      // Revert UI on error
      setProjectModel((prev) =>
        prev ? { ...prev, enabled: originalState } : null
      );
      return;
    }
    toast.success(`AI Expert ${!originalState ? 'enabled' : 'disabled'}.`);
    // Ensure editing state reflects the change if dialog was open (though unlikely workflow)
    if (editingModel && editingModel._id === projectModel._id) {
      setEditingModel((prev) =>
        prev ? { ...prev, enabled: !originalState } : null
      );
    }
  };

  // Remove the current project model configuration
  const removeProjectModel = async () => {
    if (!projectModel) return;

    // Optional: Add confirmation dialog here
    // if (!confirm("Are you sure you want to remove the AI Expert configuration for this project?")) return;

    const modelToRemoveId = projectModel._id;
    const originalModel = projectModel;
    // Optimistic UI update
    setProjectModel(null);
    setEditingModel(null); // Close edit dialog if open

    const res = await deleteModel(modelToRemoveId);
    if (res.error) {
      toast.error(`Failed to remove model: ${res.error}`);
      // Revert UI on error
      setProjectModel(originalModel);
      return;
    }
    toast.success('AI Expert removed successfully.');
  };

  // Save edits made to the project model (currently only system prompt)
  const saveModelEdits = async () => {
    if (!editingModel) return;

    const originalModel = projectModel; // For potential rollback
    const updatedData = {
      id: editingModel._id,
      systemPrompt: editingModel.systemPrompt,
      // Include other fields required by the action, even if not edited here
      // Assuming provider/model/apiKey are stable references linked from ProviderModel
      provider: editingModel.provider,
      model: editingModel.model,
      apiKey: editingModel.apiKey, // Action might need this for validation/context?
    };

    // Optimistic UI update for the main display
    setProjectModel((prev) =>
      prev ? { ...prev, systemPrompt: editingModel.systemPrompt } : null
    );
    setEditingModel(null); // Close dialog immediately

    try {
      const result = await updateModel(updatedData);

      if (result.error) {
        throw new Error(result.error);
      }

      // Parse the returned model data to ensure consistency
      const confirmedModel = JSON.parse(result.model as string);
      setProjectModel(confirmedModel); // Update with confirmed data
      toast.success('AI Expert updated successfully.');
    } catch (error: any) {
      toast.error(`Failed to update model: ${error.message}`);
      // Revert UI on error
      setProjectModel(originalModel);
      // Re-open dialog? Or just notify user? Let's notify.
      // setEditingModel(originalModel); // Re-open dialog with old data? Maybe too jarring.
    }
  };

  // Set a provider model as the project's AI model (adds if none, replaces if one exists)
  const handleSetProjectModel = async (providerModelId: string) => {
    try {
      setSettingModelId(providerModelId);
      const selectedProviderModel = providerModels.find(
        (model) => model.id === providerModelId
      );

      if (!selectedProviderModel) {
        toast.error('Selected provider model not found.');
        return;
      }

      const originalProjectModel = projectModel; // Keep for potential rollback

      // --- Step 1: Remove existing model if necessary ---
      if (projectModel) {
        // Optimistically remove current model from UI while importing
        setProjectModel(null);
        const deleteRes = await deleteModel(projectModel._id);
        if (deleteRes.error) {
          toast.error(
            `Failed to replace existing model: ${deleteRes.error}. Please try again.`
          );
          setProjectModel(originalProjectModel); // Restore old model in UI
          return; // Stop the process
        }
        // Don't toast deletion success, as it's part of replacement
      }

      // --- Step 2: Import the new model ---
      const result = await importProviderModelToProject(
        projectId,
        providerModelId,
        selectedProviderModel.name,
        selectedProviderModel.systemPrompt || '' // Use provider model's default prompt
      );

      if (result.success && result.model) {
        const newModel: ProjectAIModel = JSON.parse(result.model);
        setProjectModel(newModel);
        toast.success(`Switched AI Expert to ${newModel.name}.`);
      } else if (result.success) {
        // Fallback: Re-fetch if model data isn't returned directly
        toast.success('Model set successfully, refreshing data...');
        await fetchProjectModel(); // Re-fetch the newly set project model
      } else {
        throw new Error(result.error || 'Failed to set the new model.');
      }
    } catch (error: any) {
      console.error('Error setting project model:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setSettingModelId(null);
    }
  };

  // --- UI Helpers ---

  const getProviderGradient = (providerId: string = 'default') => {
    // Simple consistent mapping
    const lowerProvider = providerId.toLowerCase();
    if (lowerProvider.includes('openai')) return 'from-blue-400 to-indigo-500';
    if (lowerProvider.includes('anthropic'))
      return 'from-purple-400 to-pink-500';
    if (lowerProvider.includes('gemini')) return 'from-green-400 to-teal-500';
    if (lowerProvider.includes('google'))
      return 'from-yellow-400 to-orange-500';
    // Fallback gradient
    return 'from-gray-400 to-gray-500';
  };

  const getProviderInfo = (providerId: string = 'unknown') => {
    const lowerProvider = providerId.toLowerCase();
    if (lowerProvider.includes('openai'))
      return { name: 'OpenAI', icon: <Bot className='w-5 h-5' /> };
    if (lowerProvider.includes('anthropic'))
      return { name: 'Anthropic', icon: <Cpu className='w-5 h-5' /> };
    if (lowerProvider.includes('gemini') || lowerProvider.includes('google'))
      return { name: 'Google Gemini', icon: <Settings className='w-5 h-5' /> }; // Assuming gemini is Google
    return { name: providerId, icon: <Bot className='w-5 h-5' /> }; // Default
  };

  // Check if a provider model is the currently active project model
  const isCurrentProjectModel = (providerModel: ProviderModel) => {
    // Check if the providerModelId on the projectModel matches the providerModel's id
    return projectModel && projectModel.providerModelId === providerModel.id;
    // Fallback check if providerModelId is not populated reliably (less ideal)
    // return projectModel &&
    //        projectModel.provider.toLowerCase() === providerModel.provider.toLowerCase() &&
    //        projectModel.model === providerModel.model;
  };

  // --- Render ---

  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black pt-10 pb-20'>
      <div className='container mx-auto max-w-5xl px-4 sm:px-6'>
        {/* Header */}
        <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center mb-12 space-y-4 sm:space-y-0'>
          <div>
            <h1 className='text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100'>
              AI Expert Configuration
            </h1>
            <p className='text-gray-600 dark:text-gray-400 mt-2 max-w-xl'>
              Assign and configure the single AI expert for this project. Manage
              your available models and API keys globally.
            </p>
          </div>
          <div className='flex gap-3'>
            <Button
              variant='outline'
              onClick={() => router.push('/providerKeys')}
              className='bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            >
              <Key className='mr-2 h-4 w-4 text-indigo-600 dark:text-indigo-400' />
              Manage Global Models
            </Button>
            <SheetMenu />
          </div>
        </div>

        {/* Current Project AI Expert */}
        <div className='mb-12'>
          <h2 className='text-xl font-semibold text-gray-800 dark:text-gray-200 mb-5 flex items-center'>
            <Bot className='mr-3 h-5 w-5 text-indigo-600 dark:text-indigo-400' />{' '}
            Current Project AI Expert
          </h2>
          {isProjectModelLoading ? (
            <div className='flex justify-center items-center py-10 bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700'>
              <Loader2 className='w-8 h-8 text-indigo-500 animate-spin' />
              <span className='ml-3 text-gray-500 dark:text-gray-400'>
                Loading configuration...
              </span>
            </div>
          ) : projectModel ? (
            <Card className='overflow-hidden shadow-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'>
              <CardContent className='p-5 sm:p-6'>
                <div className='flex flex-col md:flex-row justify-between items-start gap-4'>
                  {/* Model Details */}
                  <div className='flex-grow min-w-0'>
                    <div className='flex items-center mb-3 gap-3'>
                      {(() => {
                        const provider = getProviderInfo(projectModel.provider);
                        const gradientClass = getProviderGradient(
                          projectModel.provider
                        );
                        return (
                          <>
                            <div
                              className={`flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br ${gradientClass} flex items-center justify-center text-white shadow-md`}
                            >
                              {provider.icon}
                            </div>
                            <div>
                              <h3
                                className='text-lg font-semibold text-gray-900 dark:text-gray-100 truncate'
                                title={projectModel.name}
                              >
                                {projectModel.name}
                              </h3>
                              <p className='text-sm text-gray-500 dark:text-gray-400'>
                                {provider.name} - {projectModel.model}
                              </p>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    <Badge
                      variant={projectModel.enabled ? 'default' : 'outline'}
                      className={`inline-flex items-center gap-1.5 mb-4 ${
                        projectModel.enabled
                          ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700'
                          : 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {projectModel.enabled ? (
                        <Power className='h-3.5 w-3.5' />
                      ) : (
                        <PowerOff className='h-3.5 w-3.5' />
                      )}
                      {projectModel.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>

                    {projectModel.systemPrompt && (
                      <div className='space-y-1.5'>
                        <Label className='text-xs font-medium text-gray-500 dark:text-gray-400'>
                          System Prompt
                        </Label>
                        <div className='bg-gray-50 dark:bg-gray-700/50 px-3 py-2 rounded-md text-sm text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 max-h-32 overflow-y-auto whitespace-pre-wrap break-words'>
                          {projectModel.systemPrompt}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className='flex flex-col sm:flex-row md:flex-col gap-2 w-full md:w-auto flex-shrink-0 pt-2 md:pt-0'>
                    <Button
                      onClick={toggleProjectModel}
                      variant={projectModel.enabled ? 'outline' : 'default'}
                      size='sm'
                      className={`w-full justify-center gap-2 ${projectModel.enabled ? 'text-yellow-600 border-yellow-300 hover:bg-yellow-50 dark:text-yellow-400 dark:border-yellow-700 dark:hover:bg-yellow-900/30' : 'bg-green-600 hover:bg-green-700 text-white dark:bg-green-600 dark:hover:bg-green-700'}`}
                    >
                      {projectModel.enabled ? (
                        <PowerOff className='h-4 w-4' />
                      ) : (
                        <Power className='h-4 w-4' />
                      )}
                      {projectModel.enabled ? 'Disable' : 'Enable'}
                    </Button>

                    <Dialog
                      open={!!editingModel}
                      onOpenChange={(open) => !open && setEditingModel(null)}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant='outline'
                          size='sm'
                          className='w-full justify-center gap-2 border-gray-300 dark:border-gray-600'
                          onClick={() => setEditingModel({ ...projectModel })}
                        >
                          <Edit className='h-4 w-4' /> Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent className='sm:max-w-[525px] bg-white dark:bg-gray-900'>
                        <DialogHeader>
                          <DialogTitle className='text-gray-900 dark:text-gray-100'>
                            Edit AI Expert Settings
                          </DialogTitle>
                          <CardDescription className='dark:text-gray-400'>
                            Modify the project-specific configuration. Provider
                            and base model cannot be changed here.
                          </CardDescription>
                        </DialogHeader>
                        {editingModel && (
                          <div className='space-y-4 py-4'>
                            <div className='space-y-2'>
                              <Label
                                htmlFor='systemPrompt'
                                className='dark:text-gray-300'
                              >
                                System Prompt
                              </Label>
                              <Textarea
                                id='systemPrompt'
                                value={editingModel.systemPrompt}
                                onChange={(e) =>
                                  setEditingModel((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          systemPrompt: e.target.value,
                                        }
                                      : null
                                  )
                                }
                                placeholder="Define the AI's role, context, or instructions..."
                                rows={6}
                                className='bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 dark:text-gray-200'
                              />
                              <p className='text-xs text-gray-500 dark:text-gray-400'>
                                You can use template variables like:
                              </p>
                              <div className='flex flex-wrap gap-1.5 mt-1'>
                                {elements.length > 0 ? (
                                  elements.map((element, index) => (
                                    <Badge
                                      key={index}
                                      variant='secondary'
                                      className='cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                      onClick={() =>
                                        setEditingModel((prev) =>
                                          prev
                                            ? {
                                                ...prev,
                                                systemPrompt:
                                                  (prev.systemPrompt || '') +
                                                  ` {${element}}`,
                                              }
                                            : null
                                        )
                                      }
                                    >
                                      {`{${element}}`}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className='text-xs text-gray-400 italic'>
                                    No template elements found.
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button
                              type='button'
                              variant='outline'
                              className='dark:text-gray-300 dark:border-gray-600'
                            >
                              Cancel
                            </Button>
                          </DialogClose>
                          <Button
                            type='button'
                            onClick={saveModelEdits}
                            className='bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white'
                          >
                            Save Changes
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Button
                      variant='outline'
                      size='sm'
                      className='w-full justify-center gap-2 text-red-600 border-red-300 hover:bg-red-50 dark:text-red-500 dark:border-red-600 dark:hover:bg-red-900/30'
                      onClick={removeProjectModel}
                    >
                      <Trash2 className='h-4 w-4' /> Remove
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className='text-center py-10 px-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-dashed border-gray-300 dark:border-gray-700'>
              <Cpu className='w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4' />
              <h3 className='text-lg font-medium text-gray-700 dark:text-gray-300 mb-2'>
                No AI Expert Assigned
              </h3>
              <p className='text-gray-500 dark:text-gray-400 text-sm'>
                Select an expert from the available models below to activate it
                for this project.
              </p>
            </div>
          )}
        </div>

        {/* Available Models Section */}
        <div className='mb-12'>
          <h2 className='text-xl font-semibold text-gray-800 dark:text-gray-200 mb-5 flex items-center'>
            <Import className='mr-3 h-5 w-5 text-purple-600 dark:text-purple-400' />{' '}
            Available Global Models
          </h2>

          {isProviderModelsLoading ? (
            <div className='flex justify-center items-center py-10'>
              <Loader2 className='w-6 h-6 text-indigo-500 animate-spin' />
              <span className='ml-3 text-gray-500 dark:text-gray-400'>
                Loading available models...
              </span>
            </div>
          ) : providerModels.length === 0 ? (
            <Card className='text-center shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'>
              <CardHeader>
                <div className='mx-auto bg-gray-100 dark:bg-gray-700 rounded-full p-3 w-fit mb-3'>
                  <Key className='w-8 h-8 text-gray-400 dark:text-gray-500' />
                </div>
                <CardTitle className='text-xl text-gray-800 dark:text-gray-200'>
                  No Global Models Configured
                </CardTitle>
                <CardDescription className='dark:text-gray-400'>
                  You need to configure AI models and their API keys in the
                  global settings first.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => router.push('/providerKeys')}>
                  <Key className='mr-2 h-4 w-4' /> Configure Global Models
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className='grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3'>
              {providerModels.map((model) => {
                const provider = getProviderInfo(model.provider);
                const gradientClass = getProviderGradient(model.provider);
                const isCurrent = isCurrentProjectModel(model);
                const isSettingThis = settingModelId === model.id;

                return (
                  <Card
                    key={model.id}
                    className={`overflow-hidden shadow-md transition-all duration-300 bg-white dark:bg-gray-800 ${
                      isCurrent
                        ? 'border-2 border-indigo-500 dark:border-indigo-600'
                        : 'border border-gray-200 dark:border-gray-700 hover:shadow-lg'
                    } ${isSettingThis ? 'opacity-70' : ''}`}
                  >
                    <CardContent className='p-4 sm:p-5 flex flex-col justify-between h-full'>
                      <div>
                        <div className='flex items-center gap-3 mb-3'>
                          <div
                            className={`flex-shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br ${gradientClass} flex items-center justify-center text-white shadow-sm`}
                          >
                            {provider.icon}
                          </div>
                          <div>
                            <h4
                              className='text-base font-semibold text-gray-900 dark:text-gray-100 truncate'
                              title={model.name}
                            >
                              {model.name}
                            </h4>
                            <p className='text-xs text-gray-500 dark:text-gray-400'>
                              {provider.name} - {model.model}
                            </p>
                          </div>
                        </div>

                        {model.systemPrompt && (
                          <div className='mt-2 mb-3 space-y-1'>
                            <Label className='text-xs font-medium text-gray-500 dark:text-gray-400'>
                              Default System Prompt
                            </Label>
                            <div className='bg-gray-50 dark:bg-gray-700/50 px-2.5 py-1.5 rounded text-xs text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 max-h-16 overflow-y-auto whitespace-pre-wrap break-words'>
                              {model.systemPrompt}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className='mt-4 flex justify-end items-center'>
                        {isCurrent ? (
                          <Badge
                            variant='default'
                            className='bg-indigo-600 dark:bg-indigo-500 text-white flex items-center text-xs px-2.5 py-1 rounded-full shadow'
                          >
                            <Check className='h-3.5 w-3.5 mr-1' /> Active
                          </Badge>
                        ) : (
                          <Button
                            variant='outline'
                            size='sm'
                            className='text-indigo-600 border-indigo-300 hover:bg-indigo-50 dark:text-indigo-400 dark:border-indigo-700 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-300 gap-2'
                            onClick={() => handleSetProjectModel(model.id)}
                            disabled={
                              isSettingThis ||
                              isProviderModelsLoading ||
                              isProjectModelLoading
                            }
                          >
                            {isSettingThis ? (
                              <>
                                <Loader2 className='h-4 w-4 animate-spin' />{' '}
                                Setting...
                              </>
                            ) : projectModel ? (
                              'Switch to this Expert'
                            ) : (
                              'Assign to Project'
                            )}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Info section */}
        <Card className='mt-12 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm'>
          <CardHeader className='flex flex-row items-center gap-3 space-y-0'>
            <div className='p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-full'>
              <Shield className='h-5 w-5 text-indigo-600 dark:text-indigo-400' />
            </div>
            <CardTitle className='text-lg text-gray-800 dark:text-gray-200'>
              How AI Experts Work
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-gray-600 dark:text-gray-400 text-sm leading-relaxed'>
              This project uses a single AI Expert, selected from your globally
              configured models. First, add your AI provider details (like
              OpenAI, Anthropic) and API keys in the{' '}
              <Button
                variant='link'
                size='sm'
                className='p-0 h-auto text-sm'
                onClick={() => router.push('/providerKeys')}
              >
                Manage Global Models
              </Button>{' '}
              section. Then, assign one of those models to this project using
              the buttons above. You can customize the system prompt
              specifically for this project's needs. Only one expert can be
              active at a time.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
