import React from 'react';
import { AlertCircle } from 'lucide-react';

// Define types for the model info structure
type ModelInfo = {
  preferred: string[];
  note: string;
};

type ModelFileSupport = {
  [key: string]: ModelInfo;
};

// Simplified model information - just the preferred formats
const modelFileSupport: ModelFileSupport = {
  'azure-ai-speech': {
    preferred: ['wav', 'mp3'],
    note: 'For best results, keep files under 25MB'
  },
  'deepgram-nova-2': {
    preferred: ['wav', 'mp3', 'flac'],
    note: 'For best results, keep files under 25MB'
  },
  'openai-whisper-large-v2': {
    preferred: ['mp3', 'wav', 'mp4'],
    note: 'For best results, keep files under 25MB'
  },
  'groq-whisper-large-v3': {
    preferred: ['mp3', 'wav', 'mp4'],
    note: 'For best results, keep files under 25MB'
  },
  'groq-whisper-large-v3-turbo': {
    preferred: ['mp3', 'wav', 'mp4'],
    note: 'For best results, keep files under 25MB'
  },
  'groq-distil-whisper': {
    preferred: ['mp3', 'wav', 'mp4'],
    note: 'For best results, keep files under 25MB'
  },
  'assemblyai-universal-2': {
    preferred: ['mp3', 'wav', 'flac'],
    note: 'For best results, keep files under 25MB'
  },
  'gladia': {
    preferred: ['wav', 'mp3', 'flac'],
    note: 'For best results, keep files under 25MB'
  },
  'speechmatics': {
    preferred: ['wav', 'mp3'],
    note: 'For best results, keep files under 25MB'
  }
};

interface TranscriptionFormatTipProps {
  selectedModel: string;
}

const TranscriptionFormatTip: React.FC<TranscriptionFormatTipProps> = ({ selectedModel }) => {
  if (!selectedModel || !modelFileSupport[selectedModel]) {
    return null;
  }
  
  const modelInfo = modelFileSupport[selectedModel];
  
  return (
    <div className="mt-2 flex items-start gap-2">
      <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
      <div className="text-xs text-blue-700">
        <span className="font-medium">Recommended formats:</span>{' '}
        {modelInfo.preferred.map((format: string) => `.${format}`).join(', ')}<br />
        <span className="text-xs text-blue-600 italic">{modelInfo.note}</span>
      </div>
    </div>
  );
};

export default TranscriptionFormatTip;