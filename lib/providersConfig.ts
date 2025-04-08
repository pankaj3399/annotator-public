// Define the available transcription providers
export const transcriptionProviders = [
  {
    id: "azure-ai-speech",
    name: "Azure AI Speech",
    instructions: "Get your API key from the Azure portal under Speech services.",
    docsLink: "https://azure.microsoft.com/en-us/services/cognitive-services/speech-services/"
  },
  {
    id: "deepgram-nova-2",
    name: "Deepgram Nova 2",
    instructions: "Sign up at Deepgram to get your API key.",
    docsLink: "https://deepgram.com"
  },
  {
    id: "gladia",
    name: "Gladia",
    instructions: "Get your API key from the Gladia dashboard.",
    docsLink: "https://gladia.io"
  },
  {
    id: "groq-distil-whisper",
    name: "Groq Distil Whisper",
    instructions: "Get your API key from the Groq console.",
    docsLink: "https://console.groq.com"
  },
  {
    id: "groq-whisper-large-v3",
    name: "Groq Whisper Large V3",
    instructions: "Get your API key from the Groq console.",
    docsLink: "https://console.groq.com"
  },
  {
    id: "groq-whisper-large-v3-turbo",
    name: "Groq Whisper Large V3 Turbo",
    instructions: "Get your API key from the Groq console.",
    docsLink: "https://console.groq.com"
  },
  {
    id: "openai-whisper-large-v2",
    name: "OpenAI Whisper Large V2",
    instructions: "Get your API key from the OpenAI dashboard.",
    docsLink: "https://platform.openai.com/account/api-keys"
  },
  {
    id: "speechmatics",
    name: "Speechmatics",
    instructions: "Get your API key from the Speechmatics dashboard.",
    docsLink: "https://www.speechmatics.com"
  },
  {
    id: "assemblyai-universal-2",
    name: "AssemblyAI Universal 2",
    instructions: "Sign up at AssemblyAI to get your API key.",
    docsLink: "https://www.assemblyai.com"
  }
];

// Define the available translation providers
export const translationProviders = [
  {
    id: "deepl",
    name: "DeepL",
    instructions: "Sign up for a DeepL API account to get your API key.",
    docsLink: "https://www.deepl.com/pro-api"
  },
  {
    id: "google-translate",
    name: "Google Translate",
    instructions: "Get your API key from Google Cloud Console.",
    docsLink: "https://cloud.google.com/translate"
  }
];

// Define the available AI model providers
export const aiProviders = [
  {
    id: 'openai',
    name: 'OpenAI',
    docsLink: 'https://platform.openai.com/docs/api-reference',
    instructions: 'Get your API key from the OpenAI dashboard.'
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    docsLink: 'https://docs.anthropic.com/claude/reference/getting-started-with-the-api',
    instructions: 'Get your API key from the Anthropic console.'
  },
  {
    id: 'gemini',
    name: 'Gemini',
    docsLink: 'https://ai.google.dev/docs',
    instructions: 'Get your API key from Google AI Studio.'
  }
];

// Define model options by provider
export const modelOptions = {
  openai: [
    { id: 'gpt-4', name: 'GPT-4' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
  ],
  anthropic: [
    { id: 'claude-3-5-sonnet-latest', name: 'Claude 3.5 Sonnet Latest' },
    { id: 'claude-3-5-sonnet-20240620', name: 'Claude 3.5 Sonnet 20240620' },
    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku 20240307' },
    { id: 'claude-3-opus-latest', name: 'Claude 3 Opus Latest' },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus 20240229' }
  ],
  gemini: [
    { id: 'gemini-1.0-pro', name: 'Gemini 1.0 Pro' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
    { id: 'gemini-pro', name: 'Gemini Pro' }
  ]
};

// Get provider configuration by ID
// Update the getProviderById function type in providersConfig.ts
export const getProviderById = (providerId: string, type: "transcription" | "translation" | "ai") => {
  if (type === "ai") {
    return aiProviders.find(provider => provider.id === providerId);
  }
  const providers = type === "transcription" ? transcriptionProviders : translationProviders;
  return providers.find(provider => provider.id === providerId);
};

// Get AI provider configuration by ID
export const getAIProviderById = (providerId: string) => {
  return aiProviders.find(p => p.id === providerId);
};