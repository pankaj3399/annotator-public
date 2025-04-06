'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from 'sonner';
import { Key, Trash2, ExternalLink, Plus, Edit, Shield } from 'lucide-react';
import { transcriptionProviders, translationProviders, getProviderById } from '@/lib/providersConfig';

// Interface for provider key details
interface ProviderKeyDetails {
  apiKey: string;
  lastUsed?: string;
  isActive?: boolean;
}

// Interface for the provider keys state
interface ProviderKeysData {
  transcriptionProviders: Record<string, ProviderKeyDetails>;
  translationProviders: Record<string, ProviderKeyDetails>;
}

export default function ProviderKeysPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [providerKeys, setProviderKeys] = useState<ProviderKeysData>({
    transcriptionProviders: {},
    translationProviders: {}
  });
  const [activeTab, setActiveTab] = useState<'transcription' | 'translation'>('transcription');
  const [editingProvider, setEditingProvider] = useState<{
    type: 'transcription' | 'translation';
    id: string;
    apiKey: string;
  } | null>(null);

  useEffect(() => {
    // Fetch provider keys on component mount
    fetchProviderKeys();
  }, []);

  const fetchProviderKeys = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/providerKeys');
      
      if (!response.ok) {
        throw new Error('Failed to fetch provider keys');
      }
      
      const data = await response.json();
      setProviderKeys(data);
    } catch (error) {
      toast.error((error as Error).message || 'An error occurred while fetching provider keys');
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
          apiKey: editingProvider.apiKey
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save provider key');
      }

      toast.success('Provider key saved successfully');
      setEditingProvider(null);
      fetchProviderKeys();
    } catch (error) {
      toast.error((error as Error).message || 'An error occurred while saving the provider key');
    }
  };

  const handleDeleteProvider = async (providerId: string, providerType: 'transcription' | 'translation') => {
    try {
      const response = await fetch(`/api/providerKeys?providerId=${providerId}&providerType=${providerType}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete provider key');
      }

      toast.success('Provider key deleted successfully');
      fetchProviderKeys();
    } catch (error) {
      toast.error((error as Error).message || 'An error occurred while deleting the provider key');
    }
  };

  const getCurrentProviders = () => {
    return activeTab === 'transcription' ? transcriptionProviders : translationProviders;
  };
  
  // Get gradient colors based on provider name - for visual variety
  const getProviderGradient = (providerId: string) => {
    const gradients = [
      'from-blue-400 to-indigo-500',
      'from-purple-400 to-pink-500',
      'from-green-400 to-teal-500',
      'from-yellow-400 to-orange-500',
      'from-red-400 to-pink-500',
      'from-indigo-400 to-purple-500'
    ];
    
    // Use a hash function to consistently map provider IDs to gradient styles
    const hash = providerId.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    
    return gradients[Math.abs(hash) % gradients.length];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pt-10 pb-20">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-12 space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Provider Keys
            </h1>
            <p className="text-gray-600 mt-2 max-w-xl">
              Manage your API keys for transcription and translation services. Your keys are securely stored and never shared.
            </p>
          </div>
          <Button
            onClick={() => setEditingProvider({
              type: activeTab,
              id: '',
              apiKey: ''
            })}
            className="relative overflow-hidden group bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-5 py-2 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105"
          >
            <span className="relative z-10 flex items-center">
              <Plus className="mr-2 h-4 w-4" /> 
              <span>Add Provider Key</span>
            </span>
            <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></span>
          </Button>
        </div>

        <div className="mb-10 flex justify-center">
          <div className="inline-flex p-1 bg-white rounded-xl shadow-md">
            <button
              onClick={() => setActiveTab('transcription')}
              className={`relative px-6 py-3 text-sm font-medium rounded-lg transition-all duration-300 ${
                activeTab === 'transcription'
                  ? 'text-white shadow-md'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
              } focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-opacity-50`}
            >
              {activeTab === 'transcription' && (
                <span className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg animate-gradient" />
              )}
              <span className="relative">Transcription</span>
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
                <span className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg animate-gradient" />
              )}
              <span className="relative">Translation</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 border-4 border-gray-200 border-t-indigo-500 rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-500 font-medium">Loading provider keys...</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {getCurrentProviders().map((provider) => {
              const providerKeysMap = activeTab === 'transcription' 
                ? providerKeys.transcriptionProviders || {}
                : providerKeys.translationProviders || {};
                
              const savedKey = providerKeysMap[provider.id];
              const hasKey = !!savedKey;
              const gradientClass = getProviderGradient(provider.id);
              
              return (
                <div 
                  key={provider.id}
                  className="group relative rounded-xl overflow-hidden bg-white shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                >
                  {/* Gradient border effect */}
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r ${gradientClass}`}></div>
                  <div className="absolute inset-0.5 bg-white rounded-xl"></div>
                  
                  <div className="relative p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <h3 className={`text-xl font-bold bg-gradient-to-r ${gradientClass} bg-clip-text text-transparent`}>
                          {provider.name}
                        </h3>
                        
                        <p className="text-sm text-gray-600 mt-1 max-w-xs">
                          {provider.instructions || `For using ${provider.name} services.`}
                        </p>
                      </div>
                      
                      {hasKey && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors duration-200 rounded-full"
                          onClick={() => handleDeleteProvider(provider.id, activeTab)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    {hasKey ? (
                      <div className="mt-6">
                        <div className="flex items-center mb-2">
                          <Shield className="h-4 w-4 text-green-500 mr-2" />
                          <label className="text-xs font-medium text-gray-500">API Key</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="bg-gray-50 px-3 py-2 rounded-lg flex-1 font-mono text-sm text-gray-700 border border-gray-200 group-hover:border-gray-300 transition-colors">
                            {savedKey.apiKey.substring(0, 4)}
                            {'•'.repeat(Math.min(10, savedKey.apiKey.length - 8))}
                            {savedKey.apiKey.substring(savedKey.apiKey.length - 4)}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className={`border-0 bg-gradient-to-r ${gradientClass} text-white shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-105`}
                            onClick={() => setEditingProvider({
                              type: activeTab,
                              id: provider.id,
                              apiKey: ''
                            })}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        
                        {savedKey.lastUsed && (
                          <p className="text-xs text-gray-500 mt-2 flex items-center">
                            <span>Last used: {new Date(savedKey.lastUsed).toLocaleString()}</span>
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="mt-6">
                        <Button
                          className={`w-full bg-white text-gray-700 border border-gray-200 hover:border-transparent hover:text-white group-hover:bg-gradient-to-r ${gradientClass} transition-all duration-300 shadow-sm hover:shadow-md`}
                          onClick={() => setEditingProvider({
                            type: activeTab,
                            id: provider.id,
                            apiKey: ''
                          })}
                        >
                          <Plus className="mr-2 h-4 w-4" /> Add API Key
                        </Button>
                      </div>
                    )}
                    
                    {provider.docsLink && (
                      <div className="mt-4">
                        <Link
                          href={provider.docsLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-xs hover:underline flex items-center transition-colors duration-200 text-gray-500 hover:text-gray-800`}
                        >
                          <ExternalLink className="mr-1 h-3 w-3" />
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

        <Dialog open={!!editingProvider} onOpenChange={(open) => !open && setEditingProvider(null)}>
          <DialogContent className="bg-white sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingProvider?.id ? `${getProviderById(editingProvider.id, editingProvider.type)?.name || editingProvider.id} API Key` : 'Add Provider Key'}
              </DialogTitle>
              <DialogDescription>
                Enter your API key for this provider.
              </DialogDescription>
            </DialogHeader>
            
            {!editingProvider?.id && (
              <div className="grid gap-4 py-2">
                <label className="text-sm font-medium text-gray-700">
                  Provider
                </label>
                <select 
                  value={editingProvider?.id || ''}
                  onChange={(e) => setEditingProvider(prev => prev ? {...prev, id: e.target.value} : null)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="" disabled>Select a provider</option>
                  {getCurrentProviders().map(provider => (
                    <option key={provider.id} value={provider.id}>{provider.name}</option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="grid gap-4 py-2">
              <label htmlFor="api-key" className="text-sm font-medium text-gray-700">
                API Key
              </label>
              <Input
                id="api-key"
                type="password"
                placeholder="Enter your API key"
                value={editingProvider?.apiKey || ''}
                onChange={(e) => setEditingProvider(prev => prev ? {...prev, apiKey: e.target.value} : null)}
                className="border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 transition-all duration-200"
              />
            </div>
            
            {editingProvider?.id && (
              <div className="mt-1 text-sm text-gray-500">
                {getProviderById(editingProvider.id, editingProvider.type)?.instructions}
                {getProviderById(editingProvider.id, editingProvider.type)?.docsLink && (
                  <Link
                    href={getProviderById(editingProvider.id, editingProvider.type)?.docsLink || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 text-indigo-500 hover:underline inline-flex items-center"
                  >
                    Visit provider
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </Link>
                )}
              </div>
            )}
            
            <DialogFooter className="mt-6">
              <Button 
                variant="outline" 
                onClick={() => setEditingProvider(null)}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors duration-200"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveProvider}
                disabled={!editingProvider?.id || !editingProvider?.apiKey}
                className="relative overflow-hidden group bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-md transition-all duration-300 transform hover:scale-105"
              >
                <span className="relative z-10">Save</span>
                <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Add CSS for animations */}
      <style jsx global>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </div>
  );
}