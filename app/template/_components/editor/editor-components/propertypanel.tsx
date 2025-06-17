//propertyPanel.tsx
'use client';

import { EditorElement, useEditor } from '@/providers/editor/editor-provider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EditorBtns } from '@/lib/constants';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Plus, Minus, Loader2, X, Trash } from 'lucide-react';
import TranscriptionFormatTip from '@/components/LandingPage/TranscriptionFormatTip';
import { Textarea } from '@/components/ui/textarea';

type ElementContent = {
  href?: string;
  innerText?: string;
  src?: string;
  selectedCheckbox?: string[];
  title?: string;
  checkboxes?: string[];
  type?: string;
  limit?: number;
  wordLimit?: number;
  keyboardNav?: boolean;
  autoSlide?: boolean;
  slideInterval?: number;
  slides?: Array<{
    type: string;
    src?: string;
    innerText?: string;
  }>;
  currentSlideIndex?: number;

  // Add all the missing properties here:
  translationEnabled?: boolean;
  translationModel?: string;
  translationApiKey?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  translation?: string;
  translationTarget?: string | null;
  copyAllowed?: boolean;
  transcribeEnabled?: boolean;
  transcriptionModel?: string;
  apiKey?: string;
  language?: string;
  backgroundNoise?: boolean;
  fillerWordRemoval?: boolean;
  silenceRemoval?: boolean;
  fileName?: string;
  instructions?: string;
  labelCategories?: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  annotations?: Array<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
    color: string;
  }>;
};
type ModelOption = {
  value: string;
  label: string;
};
interface ModelSelectorProps {
  label: string;
  modelType: 'transcription' | 'translation';
  modelOptions: ModelOption[];
  currentValue: string | undefined;
  onModelChange: (value: string, type: 'transcription' | 'translation') => void;
  loading: boolean;
  apiKeyExists: boolean | undefined;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  label,
  modelType,
  modelOptions,
  currentValue,
  onModelChange,
  loading,
  apiKeyExists,
}) => {
  // Enhanced debug logging
  // console.log(`Rendering ModelSelector for ${modelType}:`, {
  // currentValue,
  // hasApiKey: !!apiKeyExists,
  // });

  return (
    <div className='space-y-2'>
      <Label>{label}</Label>
      <select
        className='w-full p-2 border rounded-md'
        value={currentValue || ''}
        onChange={(e) => {
          // console.log(`Selected ${modelType} model:`, e.target.value);
          onModelChange(e.target.value, modelType);
        }}
      >
        <option value='' disabled>
          Select {modelType} model
        </option>
        {modelOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {loading && (
        <div className='flex items-center mt-1'>
          <Loader2 className='h-4 w-4 animate-spin mr-2' />
          <span className='text-xs'>Loading API key...</span>
        </div>
      )}

      {currentValue && (
        <div className='text-xs text-muted-foreground mt-1'>
          {apiKeyExists
            ? '✅ Using API key from project settings'
            : '⚠️ No API key found - add in project settings'}
        </div>
      )}
    </div>
  );
};
const PropertyPanel = () => {
  const { state, dispatch } = useEditor();
  const element = state.editor.selectedElement;
  const [loading, setLoading] = useState(false);

  const [elementProperties, setElementProperties] = useState<{
    id: string;
    name: string;
    content: ElementContent;
  }>({
    id: element.id || '',
    name: element.name || '',
    content: !Array.isArray(element.content)
      ? (element.content as ElementContent) || {}
      : ({} as ElementContent),
  });

  const modelFileSupport = {
    'azure-ai-speech': {
      preferred: ['wav', 'mp3'],
      note: 'PCM WAV gives best results',
    },
    'deepgram-nova-2': {
      preferred: ['wav', 'mp3', 'flac'],
      note: 'High-quality audio recommended',
    },
    'openai-whisper-large-v2': {
      preferred: ['mp3', 'wav', 'mp4'],
      note: 'Max size: 25MB',
    },
    'groq-whisper-large-v3': {
      preferred: ['mp3', 'wav', 'mp4'],
      note: 'Max size: 25MB',
    },
    'groq-whisper-large-v3-turbo': {
      preferred: ['mp3', 'wav', 'mp4'],
      note: 'Max size: 25MB',
    },
    'groq-distil-whisper': {
      preferred: ['mp3', 'wav', 'mp4'],
      note: 'Max size: 25MB',
    },
    'assemblyai-universal-2': {
      preferred: ['mp3', 'wav', 'flac'],
      note: 'Supports files up to 5GB',
    },
    gladia: {
      preferred: ['wav', 'mp3', 'flac'],
      note: 'Max size: 1GB or 4 hours',
    },
    speechmatics: {
      preferred: ['wav', 'mp3'],
      note: 'Uncompressed audio preferred',
    },
  };
  const translationModelOptions: ModelOption[] = [
    { value: 'deepl', label: 'DeepL' },
    { value: 'google-translate', label: 'Google Translate' },
    { value: 'libretranslate', label: 'LibreTranslate (Free)' },
    { value: 'mymemory', label: 'MyMemory (Free)' },
  ];

  const transcriptionModelOptions: ModelOption[] = [
    { value: 'azure-ai-speech', label: 'Azure AI Speech' },
    { value: 'deepgram-nova-2', label: 'Deepgram Nova 2' },
    { value: 'gladia', label: 'Gladia' },
    { value: 'groq-distil-whisper', label: 'Groq Distil Whisper' },
    { value: 'groq-whisper-large-v3', label: 'Groq Whisper Large V3' },
    {
      value: 'groq-whisper-large-v3-turbo',
      label: 'Groq Whisper Large V3 Turbo',
    },
    { value: 'openai-whisper-large-v2', label: 'OpenAI Whisper Large V2' },
    { value: 'speechmatics', label: 'Speechmatics' },
    { value: 'assemblyai-universal-2', label: 'AssemblyAI Universal 2' },
  ];

  useEffect(() => {
    // This effect now only runs when a *different* element is selected
    // (i.e., when element.id changes).
    // It initializes the local elementProperties state from the newly selected element.
    // Any subsequent changes to properties of this element (e.g., toggling
    // transcribeEnabled) will be managed by handlePropertyChange updating
    // elementProperties directly, without this effect clobbering that local change.
    setElementProperties({
      id: element.id || '',
      name: element.name || '',
      content: !Array.isArray(element.content)
        ? (element.content as ElementContent) || {}
        : ({} as ElementContent),
    });
  }, [element.id]); // <--- THE CRITICAL FIX: Depend on element.id

  const findAllElementsOfType = (
    elements: EditorElement[],
    types: string[]
  ): EditorElement[] => {
    let result: EditorElement[] = [];

    elements.forEach((element) => {
      if (element.type && types.includes(element.type)) {
        result.push(element);
      }
      if (element.content && Array.isArray(element.content)) {
        result = [...result, ...findAllElementsOfType(element.content, types)];
      }
    });

    return result;
  };

  const fetchApiKey = async (providerId: string, providerType: string) => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/providerKeys?providerId=${providerId}&providerType=${providerType}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch API key');
      }

      const data = await response.json();

      if (!data.exists || !data.apiKey) {
        toast({
          title: 'API Key Missing',
          description: `No API key found for ${providerId}. Please add it in project settings.`,
          variant: 'destructive',
        });
        return null;
      }

      toast({
        title: 'API Key Loaded',
        description: `Successfully loaded API key for ${providerId}`,
        variant: 'default',
      });

      return data.apiKey;
    } catch (error) {
      console.error('Error fetching API key:', error);
      toast({
        title: 'Error',
        description:
          'Failed to fetch API key. Please check if you have added the key in project settings.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleModelChange = async (
    modelValue: string,
    type: 'transcription' | 'translation'
  ): Promise<void> => {
    if (!modelValue) {
      // console.error('Model selection failed: No model value provided');
      return;
    }

    // console.log(`handleModelChange called with:`, { modelValue, type });

    const propertyPath =
      type === 'transcription' ? 'transcriptionModel' : 'translationModel';
    const apiKeyPath =
      type === 'transcription' ? 'apiKey' : 'translationApiKey';

    // Update local state first for immediate UI feedback
    // console.log(
    // `Updating model selection in local state: ${propertyPath} = ${modelValue}`
    // );
    setElementProperties((prev) => {
      const newState = {
        ...prev,
        content: {
          ...prev.content,
          [propertyPath]: modelValue,
          // Clear previous API key when model changes, it will be re-fetched
          [apiKeyPath]: '',
        },
      };
      // console.log('Updated element properties state (model select):', newState);
      return newState;
    });

    // Update in editor state
    // console.log(`Dispatching model update to editor state`);
    dispatch({
      type: 'UPDATE_ELEMENT',
      payload: {
        elementDetails: {
          ...element, // Use the current `element` prop from state for base
          content: !Array.isArray(element.content)
            ? {
                ...(element.content || {}),
                [propertyPath]: modelValue,
                [apiKeyPath]: '',
              }
            : element.content, // Should not happen for elements with these properties
        },
      },
    });

    try {
      // Fetch API key
      // console.log(`Fetching API key for ${modelValue} (${type})`);
      const apiKey = await fetchApiKey(modelValue, type);
      // console.log(
      // `API key fetch result:`,
      // apiKey ? 'Found key' : 'No key found'
      // );

      // Update with API key result in local state
      setElementProperties((prev) => ({
        ...prev,
        content: {
          ...prev.content,
          [apiKeyPath]: apiKey || '',
        },
      }));

      // Update API key in editor state
      dispatch({
        type: 'UPDATE_ELEMENT',
        payload: {
          elementDetails: {
            ...element,
            content: !Array.isArray(element.content)
              ? {
                  ...(element.content || {}),
                  [propertyPath]: modelValue, // Ensure model is still set
                  [apiKeyPath]: apiKey || '',
                }
              : element.content,
          },
        },
      });
    } catch (error) {
      console.error('Error in handleModelChange:', error);
      toast({
        title: 'Error',
        description: 'Failed to update model selection or fetch API key',
        variant: 'destructive',
      });
    }
  };

  const handlePropertyChange = (property: string, value: any) => {
    console.log('PropertyPanel: handlePropertyChange called', {
      property,
      value,
      elementType: element.type,
    });

    if (property.startsWith('content.')) {
      const contentKey = property.split('.')[1];
      console.log('PropertyPanel: Updating content property', {
        contentKey,
        value,
      });

      // Update local state
      setElementProperties((prev) => ({
        ...prev,
        content: {
          ...prev.content,
          [contentKey]: value,
        },
      }));

      // Create the updated element - CRITICAL FIX: Ensure content is always an object
      const currentContent = !Array.isArray(element.content)
        ? element.content
        : {};

      const updatedElement = {
        ...element,
        content: {
          ...currentContent,
          [contentKey]: value,
        },
      };

      console.log('PropertyPanel: Dispatching UPDATE_ELEMENT', updatedElement);

      // Use setTimeout to prevent infinite loops
      setTimeout(() => {
        dispatch({
          type: 'UPDATE_ELEMENT',
          payload: {
            elementDetails: updatedElement,
          },
        });
      }, 0);

      return;
    }

    // Handle non-content properties
    setElementProperties((prev) => ({ ...prev, [property]: value }));

    if (property === 'name') {
      setTimeout(() => {
        dispatch({
          type: 'UPDATE_ELEMENT',
          payload: {
            elementDetails: {
              ...element,
              [property]: value,
            },
          },
        });
      }, 0);
      return;
    }
  };

  if (!element || !element.id || element.type === '__body') {
    return null;
  }

  // Redundant check, but keeping for safety, already covered above.
  // if (!element || !element.id || element.type === ('__body' as EditorBtns)) {
  // return null;
  // }

  const showProperties = () => {
    switch (element.type) {
      case 'inputText':
        return (
          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label>Name</Label>
              <Input
                value={elementProperties.name}
                onChange={(e) => handlePropertyChange('name', e.target.value)}
                placeholder='Element name'
              />
            </div>

            <div className='space-y-2'>
              <Label>Placeholder</Label>
              <Input
                value={
                  !Array.isArray(elementProperties.content)
                    ? (elementProperties.content.innerText ?? '')
                    : ''
                }
                onChange={(e) =>
                  handlePropertyChange('content.innerText', e.target.value)
                }
                placeholder='Enter placeholder text'
              />
            </div>

            <div className='space-y-2'>
              <Label>Word Limit</Label>
              <Input
                type='number'
                value={
                  !Array.isArray(elementProperties.content)
                    ? (elementProperties.content.wordLimit ?? '')
                    : ''
                }
                onChange={(e) =>
                  handlePropertyChange(
                    'content.wordLimit',
                    parseInt(e.target.value) || undefined
                  )
                }
                placeholder='Enter word limit'
              />
            </div>
            <div className='space-y-2'>
              <Label>Allow Paste</Label>
              <div className='flex items-center space-x-2'>
                <Switch
                  id='copyAllowed'
                  checked={
                    !Array.isArray(elementProperties.content)
                      ? !!elementProperties.content.copyAllowed
                      : false
                  }
                  onCheckedChange={(checked) =>
                    handlePropertyChange('content.copyAllowed', checked)
                  }
                />
                <Label htmlFor='copyAllowed'>
                  {!Array.isArray(elementProperties.content) &&
                  elementProperties.content.copyAllowed
                    ? 'Enabled'
                    : 'Disabled'}
                </Label>
              </div>
            </div>
          </div>
        );

      case 'text':
      case 'dynamicText':
        return (
          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label>Name</Label>
              <Input
                value={elementProperties.name}
                onChange={(e) => handlePropertyChange('name', e.target.value)}
                placeholder='Element name'
              />
            </div>

            <div className='space-y-2'>
              <Label>Text Content</Label>
              <Input
                value={
                  !Array.isArray(elementProperties.content)
                    ? (elementProperties.content.innerText ?? '')
                    : ''
                }
                onChange={(e) =>
                  handlePropertyChange('content.innerText', e.target.value)
                }
                placeholder='Enter text content'
              />
            </div>

            {element.type === 'dynamicText' && (
              <div className='border-t pt-4 mt-4'>
                <h3 className='font-medium mb-2'>Translation Settings</h3>

                <div className='flex items-center space-x-2 mb-4'>
                  <Switch
                    id='translationEnabled'
                    checked={
                      !Array.isArray(elementProperties.content)
                        ? !!elementProperties.content.translationEnabled
                        : false
                    }
                    onCheckedChange={(checked) =>
                      handlePropertyChange(
                        'content.translationEnabled',
                        checked
                      )
                    }
                  />
                  <Label htmlFor='translationEnabled'>Enable Translation</Label>
                </div>

                {!Array.isArray(elementProperties.content) &&
                  elementProperties.content.translationEnabled && (
                    <div className='space-y-4'>
                      <div className='space-y-2'>
                        <Label>Translation Display</Label>
                        <select
                          className='w-full p-2 border rounded-md'
                          value={
                            elementProperties.content.translationTarget ||
                            'none'
                          }
                          onChange={(e) => {
                            const value = e.target.value;
                            handlePropertyChange(
                              'content.translationTarget',
                              value === 'none' ? null : value
                            );
                          }}
                        >
                          <option value='none'>Select input box</option>
                          {findAllElementsOfType(state.editor.elements, [
                            'text',
                            'inputText',
                          ])
                            .filter(
                              (e) =>
                                e.id !== element.id &&
                                (e.type === 'inputText' || e.type === 'text')
                            )
                            .map((e) => (
                              <option key={e.id} value={e.id}>
                                {e.name || `Element ${e.id.substring(0, 6)}`}
                              </option>
                            ))}
                        </select>
                        {(!elementProperties.content.translationTarget ||
                          elementProperties.content.translationTarget ===
                            'none') && (
                          <div className='text-sm text-orange-500 mt-1'>
                            Please select an input box to display the
                            translation
                          </div>
                        )}
                      </div>

                      <ModelSelector
                        label='Translation Service'
                        modelType='translation'
                        modelOptions={translationModelOptions}
                        currentValue={
                          !Array.isArray(elementProperties.content) &&
                          elementProperties.content
                            ? elementProperties.content.translationModel
                            : undefined
                        }
                        onModelChange={handleModelChange}
                        loading={loading}
                        apiKeyExists={
                          !Array.isArray(elementProperties.content) &&
                          elementProperties.content
                            ? !!elementProperties.content.translationApiKey
                            : undefined
                        }
                      />

                      <div className='space-y-2'>
                        <Label>Source Language</Label>
                        <Select
                          value={
                            !Array.isArray(elementProperties.content)
                              ? elementProperties.content.sourceLanguage ||
                                'auto'
                              : 'auto'
                          }
                          onValueChange={(value) =>
                            handlePropertyChange(
                              'content.sourceLanguage',
                              value
                            )
                          }
                        >
                          <SelectTrigger className='w-full'>
                            <SelectValue placeholder='Select source language' />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='auto'>Auto-detect</SelectItem>
                            <SelectItem value='en'>English</SelectItem>
                            <SelectItem value='es'>Spanish</SelectItem>
                            <SelectItem value='fr'>French</SelectItem>
                            <SelectItem value='de'>German</SelectItem>
                            <SelectItem value='it'>Italian</SelectItem>
                            <SelectItem value='pt'>Portuguese</SelectItem>
                            <SelectItem value='ru'>Russian</SelectItem>
                            <SelectItem value='zh'>Chinese</SelectItem>
                            <SelectItem value='ja'>Japanese</SelectItem>
                            <SelectItem value='ko'>Korean</SelectItem>
                            <SelectItem value='ar'>Arabic</SelectItem>
                            <SelectItem value='hi'>Hindi</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className='space-y-2'>
                        <Label>Target Language</Label>
                        <Select
                          value={
                            !Array.isArray(elementProperties.content)
                              ? elementProperties.content.targetLanguage || 'en'
                              : 'en'
                          }
                          onValueChange={(value) =>
                            handlePropertyChange(
                              'content.targetLanguage',
                              value
                            )
                          }
                        >
                          <SelectTrigger className='w-full'>
                            <SelectValue placeholder='Select target language' />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='en'>English</SelectItem>
                            <SelectItem value='es'>Spanish</SelectItem>
                            <SelectItem value='fr'>French</SelectItem>
                            <SelectItem value='de'>German</SelectItem>
                            <SelectItem value='it'>Italian</SelectItem>
                            <SelectItem value='pt'>Portuguese</SelectItem>
                            <SelectItem value='ru'>Russian</SelectItem>
                            <SelectItem value='zh'>Chinese</SelectItem>
                            <SelectItem value='ja'>Japanese</SelectItem>
                            <SelectItem value='ko'>Korean</SelectItem>
                            <SelectItem value='ar'>Arabic</SelectItem>
                            <SelectItem value='hi'>Hindi</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
              </div>
            )}
          </div>
        );

      case 'checkbox':
      case 'dynamicCheckbox':
        return (
          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label>Name</Label>
              <Input
                value={elementProperties.name}
                onChange={(e) => handlePropertyChange('name', e.target.value)}
                placeholder='Element name'
              />
            </div>

            <div className='space-y-2'>
              <Label>Title</Label>
              <Input
                value={
                  !Array.isArray(elementProperties.content)
                    ? (elementProperties.content.title ?? '')
                    : ''
                }
                onChange={(e) =>
                  handlePropertyChange('content.title', e.target.value)
                }
                placeholder='Enter checkbox title'
              />
            </div>

            <div className='space-y-2'>
              <Label>Options (comma-separated)</Label>
              <Input
                value={
                  !Array.isArray(elementProperties.content)
                    ? (elementProperties.content.checkboxes || []).join(', ')
                    : ''
                }
                onChange={(e) =>
                  handlePropertyChange(
                    'content.checkboxes',
                    e.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter((s) => s) // Ensure no empty strings
                  )
                }
                placeholder='Option 1, Option 2, Option 3'
              />
            </div>
          </div>
        );

      case 'video':
      case 'dynamicVideo':
        return (
          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label>Name</Label>
              <Input
                value={elementProperties.name}
                onChange={(e) => handlePropertyChange('name', e.target.value)}
                placeholder='Element name'
              />
            </div>

            <div className='space-y-2'>
              <Label>Video URL</Label>
              <Input
                value={
                  !Array.isArray(elementProperties.content)
                    ? (elementProperties.content.src ?? '')
                    : ''
                }
                onChange={(e) =>
                  handlePropertyChange('content.src', e.target.value)
                }
                placeholder='Enter video URL'
              />
            </div>
          </div>
        );

      case 'audio':
      case 'dynamicAudio':
        return (
          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label>Name</Label>
              <Input
                value={elementProperties.name}
                onChange={(e) => handlePropertyChange('name', e.target.value)}
                placeholder='Element name'
              />
            </div>

            <div className='space-y-2'>
              <Label>Audio URL</Label>
              <Input
                value={
                  !Array.isArray(elementProperties.content)
                    ? (elementProperties.content.src ?? '')
                    : ''
                }
                onChange={(e) =>
                  handlePropertyChange('content.src', e.target.value)
                }
                placeholder='Enter audio URL'
              />
            </div>

            <div className='space-y-2'>
              <Label>Time Limit (seconds)</Label>
              <Input
                type='number'
                value={
                  !Array.isArray(elementProperties.content)
                    ? (elementProperties.content.limit ?? '')
                    : ''
                }
                onChange={(e) =>
                  handlePropertyChange(
                    'content.limit',
                    parseInt(e.target.value) || undefined
                  )
                }
                placeholder='Enter time limit'
              />
            </div>

            <div className='border-t pt-4 mt-4'>
              <h3 className='font-medium mb-2'>Transcription Settings</h3>

              <div className='flex items-center space-x-2 mb-4'>
                <Switch
                  id='transcribeEnabledAudio'
                  checked={
                    !Array.isArray(elementProperties.content)
                      ? !!elementProperties.content.transcribeEnabled
                      : false
                  }
                  onCheckedChange={(checked) =>
                    handlePropertyChange('content.transcribeEnabled', checked)
                  }
                />
                <Label htmlFor='transcribeEnabledAudio'>
                  Enable Transcription
                </Label>
              </div>

              {!Array.isArray(elementProperties.content) &&
                elementProperties.content.transcribeEnabled && (
                  <div className='space-y-4'>
                    <ModelSelector
                      label='Transcription Model'
                      modelType='transcription'
                      modelOptions={transcriptionModelOptions}
                      currentValue={
                        !Array.isArray(elementProperties.content) &&
                        elementProperties.content
                          ? elementProperties.content.transcriptionModel
                          : undefined
                      }
                      onModelChange={handleModelChange}
                      loading={loading}
                      apiKeyExists={
                        !Array.isArray(elementProperties.content) &&
                        elementProperties.content
                          ? !!elementProperties.content.apiKey
                          : undefined
                      }
                    />
                    {!Array.isArray(elementProperties.content) &&
                      elementProperties.content.transcriptionModel && (
                        <TranscriptionFormatTip
                          selectedModel={
                            elementProperties.content.transcriptionModel
                          }
                        />
                      )}
                    <div className='space-y-2'>
                      <Label>Language</Label>
                      <Select
                        value={
                          !Array.isArray(elementProperties.content)
                            ? elementProperties.content.language || 'en'
                            : 'en'
                        }
                        onValueChange={(value) =>
                          handlePropertyChange('content.language', value)
                        }
                      >
                        <SelectTrigger className='w-full'>
                          <SelectValue placeholder='Select a language' />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='en'>English</SelectItem>
                          <SelectItem value='es'>Spanish</SelectItem>
                          <SelectItem value='fr'>French</SelectItem>
                          <SelectItem value='de'>German</SelectItem>
                          <SelectItem value='it'>Italian</SelectItem>
                          <SelectItem value='pt'>Portuguese</SelectItem>
                          <SelectItem value='ru'>Russian</SelectItem>
                          <SelectItem value='zh'>Chinese</SelectItem>
                          <SelectItem value='ja'>Japanese</SelectItem>
                          <SelectItem value='ko'>Korean</SelectItem>
                          <SelectItem value='ar'>Arabic</SelectItem>
                          <SelectItem value='hi'>Hindi</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
            </div>
          </div>
        );
      case 'image':
      case 'dynamicImage':
        return (
          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label>Name</Label>
              <Input
                value={elementProperties.name}
                onChange={(e) => handlePropertyChange('name', e.target.value)}
                placeholder='Element name'
              />
            </div>

            <div className='space-y-2'>
              <Label>Image URL</Label>
              <Input
                value={
                  !Array.isArray(elementProperties.content)
                    ? (elementProperties.content.src ?? '')
                    : ''
                }
                onChange={(e) =>
                  handlePropertyChange('content.src', e.target.value)
                }
                placeholder='Enter image URL'
              />
            </div>
          </div>
        );

      case 'recordVideo':
      case 'inputRecordVideo':
        return (
          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label>Name</Label>
              <Input
                value={elementProperties.name}
                onChange={(e) => handlePropertyChange('name', e.target.value)}
                placeholder='Element name'
              />
            </div>

            <div className='space-y-2'>
              <Label>Time Limit (seconds)</Label>
              <Input
                type='number'
                value={
                  !Array.isArray(elementProperties.content)
                    ? (elementProperties.content.limit ?? '')
                    : ''
                }
                onChange={(e) =>
                  handlePropertyChange(
                    'content.limit',
                    parseInt(e.target.value) || undefined
                  )
                }
                placeholder='Enter time limit'
              />
            </div>
          </div>
        );

      case 'recordAudio':
      case 'inputRecordAudio':
        return (
          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label>Name</Label>
              <Input
                value={elementProperties.name}
                onChange={(e) => handlePropertyChange('name', e.target.value)}
                placeholder='Element name'
              />
            </div>

            <div className='space-y-2'>
              <Label>Time Limit (seconds)</Label>
              <Input
                type='number'
                value={
                  !Array.isArray(elementProperties.content)
                    ? (elementProperties.content.limit ?? '')
                    : ''
                }
                onChange={(e) =>
                  handlePropertyChange(
                    'content.limit',
                    parseInt(e.target.value) || undefined
                  )
                }
                placeholder='Enter time limit'
              />
            </div>

            <div className='border-t pt-4 mt-4'>
              <h3 className='font-medium mb-2'>Transcription Settings</h3>

              <div className='flex items-center space-x-2 mb-4'>
                <Switch
                  id='transcribeEnabledRecordAudio'
                  checked={
                    !Array.isArray(elementProperties.content)
                      ? !!elementProperties.content.transcribeEnabled
                      : false
                  }
                  onCheckedChange={(checked) =>
                    handlePropertyChange('content.transcribeEnabled', checked)
                  }
                />
                <Label htmlFor='transcribeEnabledRecordAudio'>
                  Enable Transcription
                </Label>
              </div>

              {!Array.isArray(elementProperties.content) &&
                elementProperties.content.transcribeEnabled && (
                  <div className='space-y-4'>
                    <ModelSelector
                      label='Transcription Model'
                      modelType='transcription'
                      modelOptions={transcriptionModelOptions}
                      currentValue={
                        !Array.isArray(elementProperties.content) &&
                        elementProperties.content
                          ? elementProperties.content.transcriptionModel
                          : undefined
                      }
                      onModelChange={handleModelChange}
                      loading={loading}
                      apiKeyExists={
                        !Array.isArray(elementProperties.content) &&
                        elementProperties.content
                          ? !!elementProperties.content.apiKey
                          : undefined
                      }
                    />
                    {!Array.isArray(elementProperties.content) &&
                      elementProperties.content.transcriptionModel && (
                        <TranscriptionFormatTip
                          selectedModel={
                            elementProperties.content.transcriptionModel
                          }
                        />
                      )}
                    <div className='space-y-2'>
                      <Label>Language</Label>
                      <Select
                        value={
                          !Array.isArray(elementProperties.content)
                            ? elementProperties.content.language || 'en'
                            : 'en'
                        }
                        onValueChange={(value) =>
                          handlePropertyChange('content.language', value)
                        }
                      >
                        <SelectTrigger className='w-full'>
                          <SelectValue placeholder='Select a language' />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='en'>English</SelectItem>
                          <SelectItem value='es'>Spanish</SelectItem>
                          <SelectItem value='fr'>French</SelectItem>
                          <SelectItem value='de'>German</SelectItem>
                          <SelectItem value='it'>Italian</SelectItem>
                          <SelectItem value='pt'>Portuguese</SelectItem>
                          <SelectItem value='ru'>Russian</SelectItem>
                          <SelectItem value='zh'>Chinese</SelectItem>
                          <SelectItem value='ja'>Japanese</SelectItem>
                          <SelectItem value='ko'>Korean</SelectItem>
                          <SelectItem value='ar'>Arabic</SelectItem>
                          <SelectItem value='hi'>Hindi</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
            </div>

            <div className='border-t pt-4 mt-4'>
              <h3 className='font-medium mb-2'>Clean Voice Options</h3>
              <div className='flex items-center gap-2 mb-2'>
                <Switch
                  id='backgroundNoise'
                  checked={
                    !Array.isArray(elementProperties.content)
                      ? !!elementProperties.content.backgroundNoise
                      : false
                  }
                  onCheckedChange={(checked) =>
                    handlePropertyChange('content.backgroundNoise', checked)
                  }
                />
                <Label htmlFor='backgroundNoise'>
                  Background Noise Reduction
                </Label>
              </div>
              <div className='flex items-center gap-2 mb-2'>
                <Switch
                  id='silenceRemoval'
                  checked={
                    !Array.isArray(elementProperties.content)
                      ? !!elementProperties.content.silenceRemoval
                      : false
                  }
                  onCheckedChange={(checked) =>
                    handlePropertyChange('content.silenceRemoval', checked)
                  }
                />
                <Label htmlFor='silenceRemoval'>Silence Removal</Label>
              </div>
              <div className='flex items-center gap-2'>
                <Switch
                  id='fillerWordRemoval'
                  checked={
                    !Array.isArray(elementProperties.content)
                      ? !!elementProperties.content.fillerWordRemoval
                      : false
                  }
                  onCheckedChange={(checked) =>
                    handlePropertyChange('content.fillerWordRemoval', checked)
                  }
                />
                <Label htmlFor='fillerWordRemoval'>Filler Word Removal</Label>
              </div>
            </div>
          </div>
        );

      case 'dynamicCarousel': {
        const content = !Array.isArray(elementProperties.content)
          ? (elementProperties.content as ElementContent)
          : ({} as ElementContent);

        const currentSlideIndex = content.currentSlideIndex ?? 0;
        const slides = content.slides || [];

        // Ensure there's always at least one slide in local state for UI stability
        // Global state will be the source of truth eventually
        const displaySlides =
          slides.length > 0
            ? slides
            : [{ type: 'text', innerText: '{{text}}' }];
        const currentSlide =
          displaySlides[currentSlideIndex] || displaySlides[0];

        const handleAddSlide = () => {
          const newSlides = [
            ...(content.slides || []),
            {
              type: 'text',
              innerText: '{{text}}', // Default new slide
            },
          ];
          const newContent = {
            ...content,
            slides: newSlides,
            currentSlideIndex: newSlides.length - 1,
          };
          setElementProperties((prev) => ({
            ...prev,
            content: newContent as ElementContent,
          }));
          dispatch({
            type: 'UPDATE_ELEMENT',
            payload: {
              elementDetails: {
                ...element,
                content: newContent,
              },
            },
          });
        };

        const handleRemoveSlide = (index: number) => {
          if ((content.slides?.length || 0) <= 1) {
            toast({
              title: 'Cannot remove',
              description: 'Carousel must have at least one slide.',
              variant: 'destructive',
            });
            return;
          }

          const newSlides = (content.slides || []).filter(
            (_, i) => i !== index
          );
          const newCurrentIndex = Math.max(
            0,
            Math.min(index, newSlides.length - 1)
          );

          const newContent = {
            ...content,
            slides: newSlides,
            currentSlideIndex: newCurrentIndex,
          };
          setElementProperties((prev) => ({
            ...prev,
            content: newContent as ElementContent,
          }));
          dispatch({
            type: 'UPDATE_ELEMENT',
            payload: {
              elementDetails: {
                ...element,
                content: newContent,
              },
            },
          });
        };

        const handleSlideSelection = (index: number) => {
          handlePropertyChange('content.currentSlideIndex', index);
        };

        const updateCurrentSlideProperty = (property: string, value: any) => {
          const newSlides = [...(content.slides || [])];
          if (newSlides[currentSlideIndex]) {
            newSlides[currentSlideIndex] = {
              ...newSlides[currentSlideIndex],
              [property]: value,
            };
            handlePropertyChange('content.slides', newSlides);
          }
        };

        return (
          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label>Name</Label>
              <Input
                value={elementProperties.name}
                onChange={(e) => handlePropertyChange('name', e.target.value)}
                placeholder='Element name'
              />
            </div>

            <div className='space-y-2'>
              <div className='flex justify-between items-center'>
                <Label>Slides ({displaySlides.length})</Label>
                <Button variant='outline' size='sm' onClick={handleAddSlide}>
                  <Plus className='h-4 w-4 mr-1' />
                  Add Slide
                </Button>
              </div>

              <div className='flex flex-wrap gap-2 p-2 border rounded-md min-h-[40px]'>
                {displaySlides.map((slide, index) => (
                  <Button
                    key={index}
                    variant={
                      index === currentSlideIndex ? 'default' : 'outline'
                    }
                    size='sm'
                    className='relative group'
                    onClick={() => handleSlideSelection(index)}
                  >
                    Slide {index + 1}
                    {displaySlides.length > 1 && (
                      <Button
                        variant='ghost'
                        size='icon'
                        className='absolute -top-2 -right-2 h-5 w-5 p-0 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity'
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveSlide(index);
                        }}
                      >
                        <X className='h-3 w-3' />
                      </Button>
                    )}
                  </Button>
                ))}
                {displaySlides.length === 0 && (
                  <p className='text-xs text-muted-foreground'>
                    No slides yet. Click "Add Slide".
                  </p>
                )}
              </div>
            </div>
            {displaySlides.length > 0 && currentSlide && (
              <>
                <div className='space-y-2 border-t pt-4'>
                  <Label>
                    Current Slide (Editing Slide {currentSlideIndex + 1})
                  </Label>
                  <Select
                    value={currentSlide.type || 'text'}
                    onValueChange={(value) =>
                      updateCurrentSlideProperty('type', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='Select content type' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='text'>Text</SelectItem>
                      <SelectItem value='image'>Image</SelectItem>
                      <SelectItem value='video'>Video</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(currentSlide.type === 'image' ||
                  currentSlide.type === 'video') && (
                  <div className='space-y-2'>
                    <Label>
                      {currentSlide.type === 'image'
                        ? 'Image URL'
                        : 'Video URL'}
                    </Label>
                    <Input
                      value={currentSlide.src || ''}
                      onChange={(e) =>
                        updateCurrentSlideProperty('src', e.target.value)
                      }
                      placeholder={`Enter ${currentSlide.type?.toLowerCase()} URL`}
                    />
                  </div>
                )}

                {currentSlide.type === 'text' && (
                  <div className='space-y-2'>
                    <Label>Text Content</Label>
                    <Input
                      value={currentSlide.innerText || ''}
                      onChange={(e) =>
                        updateCurrentSlideProperty('innerText', e.target.value)
                      }
                      placeholder='Enter text content (e.g., {{data.some_text}} or static text)'
                    />
                  </div>
                )}
              </>
            )}

            <div className='border-t pt-4 space-y-2'>
              <div className='flex items-center space-x-2'>
                <Switch
                  id='keyboard-nav'
                  checked={!!content.keyboardNav}
                  onCheckedChange={(checked) =>
                    handlePropertyChange('content.keyboardNav', checked)
                  }
                />
                <Label htmlFor='keyboard-nav'>Enable Keyboard Navigation</Label>
              </div>

              <div className='flex items-center space-x-2'>
                <Switch
                  id='auto-slide'
                  checked={!!content.autoSlide}
                  onCheckedChange={(checked) =>
                    handlePropertyChange('content.autoSlide', checked)
                  }
                />
                <Label htmlFor='auto-slide'>Enable Auto Slide</Label>
              </div>

              {content.autoSlide && (
                <div className='space-y-2'>
                  <Label>Slide Interval (seconds)</Label>
                  <Input
                    type='number'
                    value={content.slideInterval || 5}
                    onChange={(e) =>
                      handlePropertyChange(
                        'content.slideInterval',
                        parseInt(e.target.value) || 5
                      )
                    }
                    placeholder='Enter slide interval'
                    min={1}
                  />
                </div>
              )}
            </div>
          </div>
        );
      }

      case 'dynamicImageAnnotation': {
        const content = !Array.isArray(elementProperties.content)
          ? elementProperties.content
          : {};
        const labelCategories = content?.labelCategories || [
          { id: '1', name: 'PERSON', color: '#ff0000' },
          { id: '2', name: 'VEHICLE', color: '#00ff00' },
          { id: '3', name: 'ANIMAL', color: '#0000ff' },
        ];

        return (
          <div className='space-y-4'>
            {/* Name */}
            <div className='space-y-2'>
              <Label>Name</Label>
              <Input
                value={elementProperties.name}
                onChange={(e) => handlePropertyChange('name', e.target.value)}
                placeholder='Element name'
              />
            </div>

            {/* Template Image URL (Optional - for preview during template design) */}
            <div className='space-y-2'>
              <Label>Preview Image URL (Optional)</Label>
              <Input
                type='url'
                value={content?.src || ''}
                onChange={(e) =>
                  handlePropertyChange('content.src', e.target.value)
                }
                placeholder='https://example.com/preview-image.jpg (for template preview only)'
              />
              <div className='text-xs text-gray-500'>
                💡 This URL is for template preview only. Actual image URLs will
                be provided when creating tasks.
              </div>
            </div>

            {/* Instructions */}
            <div className='space-y-2'>
              <Label>Instructions for Annotators</Label>
              <Textarea
                value={content?.instructions || ''}
                onChange={(e) =>
                  handlePropertyChange('content.instructions', e.target.value)
                }
                placeholder='Draw bounding boxes around the objects and select the appropriate label.'
                rows={3}
              />
              <div className='text-xs text-gray-500'>
                These instructions will be shown to annotators during the
                annotation task.
              </div>
            </div>

            {/* Label Categories */}
            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <Label>Label Categories</Label>
                <Button
                  size='sm'
                  onClick={() => {
                    const newCategory = {
                      id: `category-${Date.now()}`,
                      name: `LABEL_${labelCategories.length + 1}`,
                      color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
                    };
                    const updatedCategories = [...labelCategories, newCategory];
                    handlePropertyChange(
                      'content.labelCategories',
                      updatedCategories
                    );
                  }}
                >
                  <Plus className='w-4 h-4 mr-1' />
                  Add Label
                </Button>
              </div>

              <div className='text-xs text-gray-500 mb-2'>
                ⚠️ These labels will be fixed for all tasks created from this
                template.
              </div>

              <div className='space-y-3 max-h-60 overflow-y-auto'>
                {labelCategories.map((category) => (
                  <div
                    key={category.id}
                    className='flex items-center gap-2 p-3 border rounded bg-white hover:bg-gray-50'
                  >
                    <Input
                      placeholder='Label name'
                      value={category.name}
                      onChange={(e) => {
                        const updatedCategories = labelCategories.map((cat) =>
                          cat.id === category.id
                            ? { ...cat, name: e.target.value.toUpperCase() }
                            : cat
                        );
                        handlePropertyChange(
                          'content.labelCategories',
                          updatedCategories
                        );
                      }}
                      className='flex-1'
                    />
                    <div className='flex items-center gap-2'>
                      <input
                        type='color'
                        value={category.color}
                        onChange={(e) => {
                          const updatedCategories = labelCategories.map(
                            (cat) =>
                              cat.id === category.id
                                ? { ...cat, color: e.target.value }
                                : cat
                          );
                          handlePropertyChange(
                            'content.labelCategories',
                            updatedCategories
                          );
                        }}
                        className='w-10 h-10 rounded border cursor-pointer'
                        title='Choose color'
                      />
                      <Button
                        size='sm'
                        variant='destructive'
                        onClick={() => {
                          if (labelCategories.length > 1) {
                            const updatedCategories = labelCategories.filter(
                              (cat) => cat.id !== category.id
                            );
                            handlePropertyChange(
                              'content.labelCategories',
                              updatedCategories
                            );
                          }
                        }}
                        disabled={labelCategories.length <= 1}
                        title={
                          labelCategories.length <= 1
                            ? 'Must have at least one label'
                            : 'Delete label'
                        }
                      >
                        <Trash className='w-4 h-4' />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {labelCategories.length === 0 && (
                <div className='text-sm text-gray-500 text-center py-4 border border-dashed rounded'>
                  No label categories. Add at least one label.
                </div>
              )}
            </div>

            {/* Show current annotations count if any exist */}
            {content?.annotations && content.annotations.length > 0 && (
              <div className='space-y-2'>
                <Label>Current Annotations</Label>
                <div className='p-3 bg-amber-50 border border-amber-200 rounded-lg'>
                  <div className='text-sm text-amber-800 mb-2'>
                    📝 {content.annotations.length} annotation(s) from template
                    preview
                  </div>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => {
                      handlePropertyChange('content.annotations', []);
                    }}
                    className='text-amber-700 border-amber-300 hover:bg-amber-100'
                  >
                    Clear Preview Annotations
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      }

      default:
        return (
          <div className='space-y-2'>
            <Label>Name</Label>
            <Input
              value={elementProperties.name}
              onChange={(e) => handlePropertyChange('name', e.target.value)}
              placeholder='Element name'
            />
          </div>
        );
    }
  };

  return (
    <div className='p-4 space-y-4 bg-background rounded-lg border'>
      <div className='font-medium flex items-center gap-2'>
        <span className='bg-primary/5 p-2 rounded-md'>
          {element.name} ({element.type})
        </span>
      </div>

      {showProperties()}
    </div>
  );
};

export default PropertyPanel;
