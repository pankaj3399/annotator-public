// src/components/ui/DataLoadingSpinner.tsx (or choose a suitable path)
import { Loader2 } from 'lucide-react';

interface DataLoadingSpinnerProps {
  message?: string;
  fullScreen?: boolean; // Option to make it take full viewport height
}

export function DataLoadingSpinner({
  message = 'Loading data, please wait...',
  fullScreen = true,
}: DataLoadingSpinnerProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        fullScreen ? 'min-h-screen py-10' : 'py-10' // Adjust min-height/padding as needed
      }`}
    >
      <Loader2 className="h-16 w-16 animate-spin text-primary mb-6" /> {/* Increased size and margin */}
      <p className="text-xl font-semibold text-gray-700 dark:text-gray-300">{message}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
        Fetching the latest information for you.
      </p>
    </div>
  );
}