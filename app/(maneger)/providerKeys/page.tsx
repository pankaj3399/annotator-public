'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Key,
  Trash2,
  ExternalLink,
  Plus,
  Edit,
  Shield,
  Bot,
} from 'lucide-react';
import {
  transcriptionProviders,
  translationProviders,
  aiProviders,
  getProviderById,
} from '@/lib/providersConfig';
import { Textarea } from '@/components/ui/textarea';
import {
  addProviderAIModel,
  getProviderAIModels,
  updateProviderAIModel,
} from '@/app/actions/providerAIModel';

// Interface for provider key details
interface ProviderKeyDetails {
  apiKey: string;
  lastUsed?: string;
  isActive?: boolean;
}

// Interface for AI model details
interface AIModelDetails {
  name: string;
  provider: string;
  model: string;
  apiKey: string;
  systemPrompt?: string;
  lastUsed?: string;
  isActive?: boolean;
}

// Interface for the provider keys state
interface ProviderKeysData {
  transcriptionProviders: Record<string, ProviderKeyDetails>;
  translationProviders: Record<string, ProviderKeyDetails>;
  aiModels: Record<string, AIModelDetails>;
}

// Model options by provider
const modelOptions = {
  openai: [
    { id: 'gpt-4', name: 'GPT-4' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
  ],
  anthropic: [
    { id: 'claude-3-5-sonnet-latest', name: 'Claude 3.5 Sonnet Latest' },
    { id: 'claude-3-5-sonnet-20240620', name: 'Claude 3.5 Sonnet 20240620' },
    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku 20240307' },
    { id: 'claude-3-opus-latest', name: 'Claude 3 Opus Latest' },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus 20240229' },
  ],
  gemini: [
    { id: 'gemini-1.0-pro', name: 'Gemini 1.0 Pro' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
    { id: 'gemini-pro', name: 'Gemini Pro' },
  ],
};

export default function ProviderKeysPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [providerKeys, setProviderKeys] = useState<ProviderKeysData>({
    transcriptionProviders: {},
    translationProviders: {},
    aiModels: {},
  });
  const [activeTab, setActiveTab] = useState<
    'transcription' | 'translation' | 'aiModels'
  >('transcription');
  const [editingProvider, setEditingProvider] = useState<{
    type: 'transcription' | 'translation' | 'ai';
    id: string;
    apiKey: string;
  } | null>(null);

  const [editingAIModel, setEditingAIModel] = useState<{
    id?: string;
    name: string;
    provider: string;
    model: string;
    apiKey: string;
    systemPrompt: string;
  } | null>(null);

  useEffect(() => {
    // Fetch provider keys on component mount
    fetchProviderKeys();
  }, []);
  const fetchProviderKeys = async () => {
    try {
      setLoading(true);

      // Fetch transcription and translation providers
      const response = await fetch('/api/providerKeys');

      if (!response.ok) {
        throw new Error('Failed to fetch provider keys');
      }

      const data = await response.json();

      // Fetch AI models using the server action
      const aiModelsResult = await getProviderAIModels();

      if (!aiModelsResult.success) {
        throw new Error(aiModelsResult.error || 'Failed to fetch AI models');
      }

      // Use proper typing for the formatted models
      const aiModelsFormatted: Record<string, AIModelDetails> = {};

      if (aiModelsResult.models && aiModelsResult.models.length > 0) {
        aiModelsResult.models.forEach((model) => {
          aiModelsFormatted[model.id] = {
            name: model.name,
            provider: model.provider,
            model: model.model,
            apiKey: model.apiKey,
            systemPrompt: model.systemPrompt,
            lastUsed: model.lastUsed
              ? model.lastUsed instanceof Date
                ? model.lastUsed.toISOString()
                : model.lastUsed
              : model.createdAt instanceof Date
                ? model.createdAt.toISOString()
                : model.createdAt,
          };
        });
      }

      setProviderKeys({
        transcriptionProviders: data.transcriptionProviders || {},
        translationProviders: data.translationProviders || {},
        aiModels: aiModelsFormatted,
      });
    } catch (error) {
      toast.error(
        (error as Error).message ||
          'An error occurred while fetching provider keys'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProvider = async () => {
    if (!editingProvider) return;

    try {
      if (!editingProvider.id || !editingProvider.apiKey) {
        toast.error('Please enter an API key');
        return;
      }

      const response = await fetch('/api/providerKeys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          providerType: editingProvider.type,
          providerId: editingProvider.id,
          apiKey: editingProvider.apiKey,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save provider key');
      }

      toast.success('Provider key saved successfully');
      setEditingProvider(null);
      fetchProviderKeys();
    } catch (error) {
      toast.error(
        (error as Error).message ||
          'An error occurred while saving the provider key'
      );
    }
  };

  const handleSaveAIModel = async () => {
    if (!editingAIModel) return;

    try {
      // Generate name from model if not provided
      const modelName =
        editingAIModel.name.trim() ||
        modelOptions[
          editingAIModel.provider as keyof typeof modelOptions
        ]?.find((m) => m.id === editingAIModel.model)?.name ||
        editingAIModel.model;

      if (
        !editingAIModel.provider ||
        !editingAIModel.model ||
        (!editingAIModel.id && !editingAIModel.apiKey)
      ) {
        toast.error('Please select a provider, model, and enter an API key');
        return;
      }

      let result;

      if (editingAIModel.id) {
        // Update existing model
        result = await updateProviderAIModel({
          id: editingAIModel.id,
          name: modelName, // Use generated name if empty
          model: editingAIModel.model,
          provider: editingAIModel.provider,
          apiKey: editingAIModel.apiKey || undefined,
          systemPrompt: editingAIModel.systemPrompt,
        });
      } else {
        // Add new model
        result = await addProviderAIModel(
          editingAIModel.provider,
          editingAIModel.model,
          editingAIModel.apiKey,
          modelName, // Use generated name if empty
          editingAIModel.systemPrompt || ''
        );
      }

      if (result.error) {
        throw new Error(result.error);
      }

      toast.success(result.message || 'AI model saved successfully');
      setEditingAIModel(null);
      fetchProviderKeys();
    } catch (error) {
      toast.error(
        (error as Error).message ||
          'An error occurred while saving the AI model'
      );
    }
  };

  const handleDeleteProvider = async (
    providerId: string,
    providerType: 'transcription' | 'translation' | 'ai'
  ) => {
    try {
      let url = `/api/providerKeys?providerId=${providerId}&providerType=${providerType}`;

      if (providerType === 'ai') {
        url = `/api/providerKeys/aiProviders?providerId=${providerId}`;
      }

      const response = await fetch(url, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete provider key');
      }

      toast.success('Provider key deleted successfully');
      fetchProviderKeys();
    } catch (error) {
      toast.error(
        (error as Error).message ||
          'An error occurred while deleting the provider key'
      );
    }
  };

  const handleDeleteAIModel = async (modelId: string) => {
    try {
      const response = await fetch(
        `/api/providerKeys/aiModels?modelId=${modelId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete AI model');
      }

      toast.success('AI model deleted successfully');
      fetchProviderKeys();
    } catch (error) {
      toast.error(
        (error as Error).message ||
          'An error occurred while deleting the AI model'
      );
    }
  };

  const getCurrentProviders = () => {
    if (activeTab === 'aiModels') return aiProviders;
    return activeTab === 'transcription'
      ? transcriptionProviders
      : translationProviders;
  };

  // Get gradient colors based on provider name - for visual variety
  const getProviderGradient = (providerId: string) => {
    const gradients = [
      'from-blue-400 to-indigo-500',
      'from-purple-400 to-pink-500',
      'from-green-400 to-teal-500',
      'from-yellow-400 to-orange-500',
      'from-red-400 to-pink-500',
      'from-indigo-400 to-purple-500',
    ];

    // Use a hash function to consistently map provider IDs to gradient styles
    const hash = providerId.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);

    return gradients[Math.abs(hash) % gradients.length];
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pt-10 pb-20'>
      <div className='container mx-auto max-w-6xl px-4 sm:px-6'>
        <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center mb-12 space-y-4 sm:space-y-0'>
          <div>
            <h1 className='text-4xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent'>
              Provider Keys
            </h1>
            <p className='text-gray-600 mt-2 max-w-xl'>
              Manage your API keys for AI services. Your keys are securely
              stored and never shared.
            </p>
          </div>
          <Button
            onClick={() => {
              if (activeTab === 'aiModels') {
                setEditingAIModel({
                  name: '',
                  provider: '',
                  model: '',
                  apiKey: '',
                  systemPrompt: '',
                });
              } else {
                setEditingProvider({
                  type: activeTab,
                  id: '',
                  apiKey: '',
                });
              }
            }}
            className='relative overflow-hidden group bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-5 py-2 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105'
          >
            <span className='relative z-10 flex items-center'>
              <Plus className='mr-2 h-4 w-4' />
              <span>
                Add {activeTab === 'aiModels' ? 'AI Model' : 'Provider Key'}
              </span>
            </span>
            <span className='absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300'></span>
          </Button>
        </div>

        <div className='mb-10 flex justify-center'>
          <div className='inline-flex p-1 bg-white rounded-xl shadow-md'>
            <button
              onClick={() => setActiveTab('transcription')}
              className={`relative px-6 py-3 text-sm font-medium rounded-lg transition-all duration-300 ${
                activeTab === 'transcription'
                  ? 'text-white shadow-md'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
              } focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-opacity-50`}
            >
              {activeTab === 'transcription' && (
                <span className='absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg animate-gradient' />
              )}
              <span className='relative'>Transcription</span>
            </button>
            <button
              onClick={() => setActiveTab('translation')}
              className={`relative px-6 py-3 text-sm font-medium rounded-lg transition-all duration-300 ${
                activeTab === 'translation'
                  ? 'text-white shadow-md'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
              } focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-opacity-50`}
            >
              {activeTab === 'translation' && (
                <span className='absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg animate-gradient' />
              )}
              <span className='relative'>Translation</span>
            </button>
            <button
              onClick={() => setActiveTab('aiModels')}
              className={`relative px-6 py-3 text-sm font-medium rounded-lg transition-all duration-300 ${
                activeTab === 'aiModels'
                  ? 'text-white shadow-md'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
              } focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-opacity-50`}
            >
              {activeTab === 'aiModels' && (
                <span className='absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg animate-gradient' />
              )}
              <span className='relative'>AI Models</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className='flex flex-col items-center justify-center py-16'>
            <div className='w-16 h-16 border-4 border-gray-200 border-t-indigo-500 rounded-full animate-spin'></div>
            <p className='mt-4 text-gray-500 font-medium'>
              Loading provider keys...
            </p>
          </div>
        ) : activeTab === 'aiModels' ? (
          <div>
            {/* AI Provider Cards - Improved responsiveness */}
            <div className='mb-10'>
              <h2 className='text-lg font-medium text-gray-700 mb-5'>
                Available AI Providers
              </h2>
              <div className='grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'>
                {aiProviders.map((provider) => {
                  const providerKeysMap = providerKeys.aiModels || {};
                  const hasKey = Object.values(providerKeysMap).some(
                    (model) => model.provider === provider.id
                  );
                  const gradientClass = getProviderGradient(provider.id);

                  return (
                    <div
                      key={provider.id}
                      className='group relative rounded-xl overflow-hidden bg-white shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1'
                    >
                      <div
                        className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r ${gradientClass}`}
                      ></div>
                      <div className='absolute inset-0.5 bg-white rounded-xl'></div>

                      <div className='relative p-4 sm:p-6'>
                        <div className='flex justify-between items-start'>
                          <div className='flex flex-col'>
                            <h3
                              className={`text-lg sm:text-xl font-bold bg-gradient-to-r ${gradientClass} bg-clip-text text-transparent flex items-center`}
                            >
                              <Bot className='h-5 w-5 mr-2' />
                              {provider.name}
                            </h3>

                            <p className='text-xs sm:text-sm text-gray-600 mt-1 max-w-xs'>
                              {provider.instructions ||
                                `For using ${provider.name} models.`}
                            </p>
                          </div>
                        </div>

                        <div className='mt-4'>
                          <Button
                            className={`w-full bg-white text-gray-700 border border-gray-200 hover:border-transparent hover:text-white group-hover:bg-gradient-to-r ${gradientClass} transition-all duration-300 shadow-sm hover:shadow-md`}
                            onClick={() =>
                              setEditingAIModel({
                                name: '',
                                provider: provider.id,
                                model: '', // Pre-select first model
                                apiKey: '',
                                systemPrompt: '',
                              })
                            }
                          >
                            <Plus className='h-4 w-4 mr-2' /> Add Model
                            Configuration
                          </Button>
                        </div>

                        {provider.docsLink && (
                          <div className='mt-3'>
                            <Link
                              href={provider.docsLink}
                              target='_blank'
                              rel='noopener noreferrer'
                              className={`text-xs hover:underline flex items-center transition-colors duration-200 text-gray-500 hover:text-gray-800`}
                            >
                              <ExternalLink className='mr-1 h-3 w-3' />
                              View Documentation
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AI Models List - Improved responsiveness */}
            <div className='mt-12'>
              <h2 className='text-lg font-medium text-gray-700 mb-5'>
                Your AI Model Configurations
              </h2>

              <div className='grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'>
                {Object.entries(providerKeys.aiModels || {}).map(
                  ([modelId, model]) => {
                    const gradientClass = getProviderGradient(model.provider);
                    const providerName =
                      aiProviders.find((p) => p.id === model.provider)?.name ||
                      model.provider;

                    return (
                      <div
                        key={modelId}
                        className='group relative rounded-xl overflow-hidden bg-white shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1'
                      >
                        <div
                          className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r ${gradientClass}`}
                        ></div>
                        <div className='absolute inset-0.5 bg-white rounded-xl'></div>

                        <div className='relative p-4 sm:p-6'>
                          <div className='flex justify-between items-start'>
                            <div className='flex flex-col'>
                              <h3
                                className={`text-lg sm:text-xl font-bold bg-gradient-to-r ${gradientClass} bg-clip-text text-transparent flex items-center truncate max-w-[200px]`}
                              >
                                <Bot className='h-5 w-5 mr-2 flex-shrink-0' />
                                <span className='truncate'>{model.name}</span>
                              </h3>

                              <div className='flex flex-col mt-1'>
                                <span className='text-xs text-gray-500'>
                                  Provider:{' '}
                                  <span className='font-medium text-gray-700'>
                                    {providerName}
                                  </span>
                                </span>
                                <span className='text-xs text-gray-500 truncate max-w-[200px]'>
                                  Model:{' '}
                                  <span className='font-medium text-gray-700'>
                                    {model.model}
                                  </span>
                                </span>
                              </div>
                            </div>

                            <Button
                              variant='ghost'
                              size='icon'
                              className='text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors duration-200 rounded-full flex-shrink-0'
                              onClick={() => handleDeleteAIModel(modelId)}
                            >
                              <Trash2 className='h-4 w-4' />
                            </Button>
                          </div>

                          <div className='mt-3 sm:mt-4'>
                            <div className='flex items-center mb-1 sm:mb-2'>
                              <Shield className='h-4 w-4 text-green-500 mr-1 sm:mr-2 flex-shrink-0' />
                              <label className='text-xs font-medium text-gray-500'>
                                API Key
                              </label>
                            </div>
                            <div className='flex items-center space-x-2'>
                              <div className='bg-gray-50 px-2 sm:px-3 py-2 rounded-lg flex-1 font-mono text-xs sm:text-sm text-gray-700 border border-gray-200 group-hover:border-gray-300 transition-colors overflow-x-auto'>
                                {model.apiKey.substring(0, 4)}
                                {'•'.repeat(
                                  Math.min(10, model.apiKey.length - 8)
                                )}
                                {model.apiKey.substring(
                                  model.apiKey.length - 4
                                )}
                              </div>
                              <Button
                                variant='outline'
                                size='sm'
                                className={`border-0 bg-gradient-to-r ${gradientClass} text-white shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-105 flex-shrink-0`}
                                onClick={() =>
                                  setEditingAIModel({
                                    id: modelId,
                                    name: model.name,
                                    provider: model.provider,
                                    model: model.model,
                                    apiKey: '',
                                    systemPrompt: model.systemPrompt || '',
                                  })
                                }
                              >
                                <Edit className='h-3.5 w-3.5' />
                              </Button>
                            </div>
                          </div>

                          {model.systemPrompt && (
                            <div className='mt-2 sm:mt-3'>
                              <div className='flex items-center mb-1'>
                                <label className='text-xs font-medium text-gray-500'>
                                  System Prompt
                                </label>
                              </div>
                              <div className='bg-gray-50 px-2 sm:px-3 py-2 rounded-lg text-xs text-gray-700 border border-gray-200 group-hover:border-gray-300 transition-colors max-h-24 overflow-y-auto'>
                                {model.systemPrompt}
                              </div>
                            </div>
                          )}

                          {model.lastUsed && (
                            <p className='text-xs text-gray-500 mt-2 sm:mt-3 flex items-center'>
                              <span>
                                Last used:{' '}
                                {new Date(model.lastUsed).toLocaleString()}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  }
                )}

                {/* Empty state for AI Models */}
                {Object.keys(providerKeys.aiModels || {}).length === 0 && (
                  <div className='col-span-full flex flex-col items-center justify-center py-12 bg-white rounded-xl shadow-sm'>
                    <Bot className='h-14 w-14 mb-3 text-gray-300' />
                    <h3 className='text-lg font-medium text-gray-700 mb-2'>
                      No AI Models Configured
                    </h3>

                    <Button
                      onClick={() =>
                        setEditingAIModel({
                          name: '',
                          provider: aiProviders[0]?.id || '',
                          model: '',
                          apiKey: '',
                          systemPrompt: '',
                        })
                      }
                      className='bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700'
                    >
                      <Plus className='mr-2 h-4 w-4' /> Add AI Model
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          // Transcription & Translation Tabs Content
          <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
            {getCurrentProviders().map((provider) => {
              const providerKeysMap =
                activeTab === 'transcription'
                  ? providerKeys.transcriptionProviders || {}
                  : providerKeys.translationProviders || {};

              const savedKey = providerKeysMap[provider.id];
              const hasKey = !!savedKey;
              const gradientClass = getProviderGradient(provider.id);

              return (
                <div
                  key={provider.id}
                  className='group relative rounded-xl overflow-hidden bg-white shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1'
                >
                  {/* Gradient border effect */}
                  <div
                    className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r ${gradientClass}`}
                  ></div>
                  <div className='absolute inset-0.5 bg-white rounded-xl'></div>

                  <div className='relative p-6'>
                    <div className='flex justify-between items-start'>
                      <div className='flex flex-col'>
                        <h3
                          className={`text-xl font-bold bg-gradient-to-r ${gradientClass} bg-clip-text text-transparent`}
                        >
                          {provider.name}
                        </h3>

                        <p className='text-sm text-gray-600 mt-1 max-w-xs'>
                          {provider.instructions ||
                            `For using ${provider.name} services.`}
                        </p>
                      </div>

                      {hasKey && (
                        <Button
                          variant='ghost'
                          size='icon'
                          className='text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors duration-200 rounded-full'
                          onClick={() =>
                            handleDeleteProvider(provider.id, activeTab)
                          }
                        >
                          <Trash2 className='h-4 w-4' />
                        </Button>
                      )}
                    </div>

                    {hasKey ? (
                      <div className='mt-6'>
                        <div className='flex items-center mb-2'>
                          <Shield className='h-4 w-4 text-green-500 mr-2' />
                          <label className='text-xs font-medium text-gray-500'>
                            API Key
                          </label>
                        </div>
                        <div className='flex items-center space-x-2'>
                          <div className='bg-gray-50 px-3 py-2 rounded-lg flex-1 font-mono text-sm text-gray-700 border border-gray-200 group-hover:border-gray-300 transition-colors'>
                            {savedKey.apiKey.substring(0, 4)}
                            {'•'.repeat(
                              Math.min(10, savedKey.apiKey.length - 8)
                            )}
                            {savedKey.apiKey.substring(
                              savedKey.apiKey.length - 4
                            )}
                          </div>
                          <Button
                            variant='outline'
                            size='sm'
                            className={`border-0 bg-gradient-to-r ${gradientClass} text-white shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-105`}
                            onClick={() =>
                              setEditingProvider({
                                type: activeTab,
                                id: provider.id,
                                apiKey: '',
                              })
                            }
                          >
                            <Edit className='h-3.5 w-3.5' />
                          </Button>
                        </div>

                        {savedKey.lastUsed && (
                          <p className='text-xs text-gray-500 mt-2 flex items-center'>
                            <span>
                              Last used:{' '}
                              {new Date(savedKey.lastUsed).toLocaleString()}
                            </span>
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className='mt-6'>
                        <Button
                          className={`w-full bg-white text-gray-700 border border-gray-200 hover:border-transparent hover:text-white group-hover:bg-gradient-to-r ${gradientClass} transition-all duration-300 shadow-sm hover:shadow-md`}
                          onClick={() =>
                            setEditingProvider({
                              type: activeTab,
                              id: provider.id,
                              apiKey: '',
                            })
                          }
                        >
                          <Plus className='mr-2 h-4 w-4' /> Add API Key
                        </Button>
                      </div>
                    )}

                    {provider.docsLink && (
                      <div className='mt-4'>
                        <Link
                          href={provider.docsLink}
                          target='_blank'
                          rel='noopener noreferrer'
                          className={`text-xs hover:underline flex items-center transition-colors duration-200 text-gray-500 hover:text-gray-800`}
                        >
                          <ExternalLink className='mr-1 h-3 w-3' />
                          View Documentation
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Provider Key Dialog */}
        <Dialog
          open={!!editingProvider}
          onOpenChange={(open) => !open && setEditingProvider(null)}
        >
          <DialogContent className='bg-white sm:max-w-lg'>
            <DialogHeader>
              <DialogTitle>
                {editingProvider?.id
                  ? `${getProviderById(editingProvider.id, editingProvider.type as any)?.name || editingProvider.id} API Key`
                  : ''}
              </DialogTitle>
              <DialogDescription>
                Enter your API key for this provider.
              </DialogDescription>
            </DialogHeader>

            {!editingProvider?.id && (
              <div className='grid gap-4 py-2'>
                <label className='text-sm font-medium text-gray-700'>
                  Provider
                </label>
                <select
                  value={editingProvider?.id || ''}
                  onChange={(e) =>
                    setEditingProvider((prev) =>
                      prev ? { ...prev, id: e.target.value } : null
                    )
                  }
                  className='w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                >
                  <option value='' disabled>
                    Select a provider
                  </option>
                  {getCurrentProviders().map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className='grid gap-4 py-2'>
              <label
                htmlFor='api-key'
                className='text-sm font-medium text-gray-700'
              >
                API Key
              </label>
              <Input
                id='api-key'
                type='password'
                placeholder='Enter your API key'
                value={editingProvider?.apiKey || ''}
                onChange={(e) =>
                  setEditingProvider((prev) =>
                    prev ? { ...prev, apiKey: e.target.value } : null
                  )
                }
                className='border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 transition-all duration-200'
              />
            </div>

            {editingProvider?.id && (
              <div className='mt-1 text-sm text-gray-500'>
                {
                  getProviderById(
                    editingProvider.id,
                    editingProvider.type as any
                  )?.instructions
                }
                {getProviderById(
                  editingProvider.id,
                  editingProvider.type as any
                )?.docsLink && (
                  <Link
                    href={
                      getProviderById(
                        editingProvider.id,
                        editingProvider.type as any
                      )?.docsLink || '#'
                    }
                    target='_blank'
                    rel='noopener noreferrer'
                    className='ml-1 text-indigo-500 hover:underline inline-flex items-center'
                  >
                    Visit provider
                    <ExternalLink className='ml-1 h-3 w-3' />
                  </Link>
                )}
              </div>
            )}

            <DialogFooter className='mt-6'>
              <Button
                variant='outline'
                onClick={() => setEditingProvider(null)}
                className='border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors duration-200'
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveProvider}
                disabled={!editingProvider?.id || !editingProvider?.apiKey}
                className='relative overflow-hidden group bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-md transition-all duration-300 transform hover:scale-105'
              >
                <span className='relative z-10'>Save</span>
                <span className='absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300'></span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* AI Model Dialog - Beautiful UI for model selection */}
        <Dialog
          open={!!editingAIModel}
          onOpenChange={(open) => !open && setEditingAIModel(null)}
        >
          <DialogContent className='bg-white sm:max-w-lg max-h-[90vh] overflow-y-auto'>
            <DialogHeader>
              <DialogTitle>
                {editingAIModel?.id ? `Edit AI Model` : 'Add AI Model'}
              </DialogTitle>
              <DialogDescription>
                Configure an AI model for project guidelines.
              </DialogDescription>
            </DialogHeader>

            <div className='grid gap-4 py-2'>
              <label className='text-sm font-medium text-gray-700'>
                Model Name
              </label>
              <Input
                placeholder='Model Name'
                value={editingAIModel?.name || ''}
                onChange={(e) =>
                  setEditingAIModel((prev) =>
                    prev ? { ...prev, name: e.target.value } : null
                  )
                }
                className='border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 transition-all duration-200'
              />
              <p className='text-xs text-gray-500 -mt-2'>
                If left empty, the selected model name will be used.
              </p>
            </div>

            {/* Provider Selection - Add this if not already present */}
            {!editingAIModel?.provider && (
              <div className='grid gap-4 py-2'>
                <label className='text-sm font-medium text-gray-700'>
                  Provider
                </label>
                <select
                  value={editingAIModel?.provider || ''}
                  onChange={(e) =>
                    setEditingAIModel((prev) =>
                      prev
                        ? { ...prev, provider: e.target.value, model: '' }
                        : null
                    )
                  }
                  className='w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                >
                  <option value='' disabled>
                    Select a provider
                  </option>
                  {aiProviders.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Model Selection with visual selector */}
            {editingAIModel?.provider && (
              <div className='grid gap-4 py-2'>
                <label className='text-sm font-medium text-gray-700'>
                  Model
                </label>
                <div className='grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2'>
                  {modelOptions[
                    editingAIModel.provider as keyof typeof modelOptions
                  ]?.map((model) => {
                    const isSelected = editingAIModel?.model === model.id;
                    const gradientClass = getProviderGradient(
                      editingAIModel.provider + model.id
                    );

                    return (
                      <div
                        key={model.id}
                        onClick={() =>
                          setEditingAIModel((prev) =>
                            prev ? { ...prev, model: model.id } : null
                          )
                        }
                        className={`cursor-pointer p-3 rounded-lg border transition-all duration-200 ${
                          isSelected
                            ? `border-indigo-500 bg-indigo-50 shadow-sm`
                            : `border-gray-200 hover:border-indigo-300 hover:bg-gray-50`
                        }`}
                      >
                        <div className='flex items-center justify-between'>
                          <span
                            className={`font-medium ${isSelected ? 'text-indigo-700' : 'text-gray-700'}`}
                          >
                            {model.name}
                          </span>
                          {isSelected && (
                            <div className='h-4 w-4 rounded-full bg-indigo-500 flex items-center justify-center'>
                              <span className='text-white text-[8px]'>✓</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className='grid gap-4 py-2'>
              <label
                htmlFor='api-key'
                className='text-sm font-medium text-gray-700'
              >
                API Key
              </label>
              <Input
                id='api-key'
                type='password'
                placeholder='Enter your API key'
                value={editingAIModel?.apiKey || ''}
                onChange={(e) =>
                  setEditingAIModel((prev) =>
                    prev ? { ...prev, apiKey: e.target.value } : null
                  )
                }
                className='border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 transition-all duration-200'
              />
            </div>

            {editingAIModel?.provider && (
              <div className='mt-1 text-sm text-gray-500'>
                {getProviderById(editingAIModel.provider, 'ai')?.instructions}
                {getProviderById(editingAIModel.provider, 'ai')?.docsLink && (
                  <Link
                    href={
                      getProviderById(editingAIModel.provider, 'ai')
                        ?.docsLink || '#'
                    }
                    target='_blank'
                    rel='noopener noreferrer'
                    className='ml-1 text-indigo-500 hover:underline inline-flex items-center'
                  >
                    Visit provider
                    <ExternalLink className='ml-1 h-3 w-3' />
                  </Link>
                )}
              </div>
            )}

            <DialogFooter className='mt-6'>
              <Button
                variant='outline'
                onClick={() => setEditingAIModel(null)}
                className='border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors duration-200'
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveAIModel}
                disabled={
                  !editingAIModel?.model ||
                  (!editingAIModel?.id && !editingAIModel?.apiKey)
                }
                className='relative overflow-hidden group bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-md transition-all duration-300 transform hover:scale-105'
              >
                <span className='relative z-10'>Save</span>
                <span className='absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300'></span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Add CSS for animations */}
      <style jsx global>{`
        @keyframes gradient {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </div>
  );
}
