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
  
  // Get provider configuration by ID
  export const getProviderById = (providerId: string, type: "transcription" | "translation") => {
    const providers = type === "transcription" ? transcriptionProviders : translationProviders;
    return providers.find(provider => provider.id === providerId);
  };