// components/ErrorBoundaryWrapper.tsx
'use client';
import React, { Component, ReactNode } from 'react';
import { RefreshCw, AlertCircle, WifiOff, Database } from 'lucide-react';

interface RefreshErrorProps {
  error?: Error;
  onRetry?: () => void;
  title?: string;
  message?: string;
}

const RefreshError: React.FC<RefreshErrorProps> = ({
  error,
  onRetry,
  title = "Database Connection Issue",
  message = "We're experiencing a temporary database connection issue. Please refresh the page to try again."
}) => {
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Small delay for better UX
    setTimeout(() => {
      if (onRetry) {
        onRetry();
      } else {
        window.location.reload();
      }
    }, 300);
  };

  // Check if it's a timeout or database error (including Mongoose errors)
  const isTimeoutError = error?.message?.toLowerCase().includes('timeout') || 
                        error?.message?.toLowerCase().includes('buffering timed out') ||
                        error?.message?.toLowerCase().includes('connection') ||
                        error?.message?.toLowerCase().includes('database') ||
                        error?.message?.toLowerCase().includes('mongoose');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 max-w-lg w-full text-center border border-white/20">
        {/* Animated Icon */}
        <div className="mb-8 relative">
          <div className="mx-auto w-24 h-24 bg-gradient-to-br from-red-400 via-orange-400 to-amber-400 rounded-full flex items-center justify-center shadow-lg">
            {isRefreshing ? (
              <RefreshCw className="w-12 h-12 text-white animate-spin" />
            ) : isTimeoutError ? (
              <Database className="w-12 h-12 text-white" />
            ) : (
              <WifiOff className="w-12 h-12 text-white" />
            )}
          </div>
          
          {/* Pulse rings */}
          <div className="absolute inset-0 w-24 h-24 mx-auto">
            <div className="w-full h-full bg-orange-300 rounded-full animate-ping opacity-20"></div>
          </div>
          <div className="absolute inset-2 w-20 h-20 mx-auto">
            <div className="w-full h-full bg-red-300 rounded-full animate-ping opacity-30" style={{animationDelay: '75ms'}}></div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-800 mb-4 bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
          {isRefreshing ? "Refreshing..." : title}
        </h1>

        {/* Message */}
        <p className="text-gray-600 mb-8 leading-relaxed text-lg">
          {isRefreshing 
            ? "Please wait while we refresh the page..."
            : message
          }
        </p>

        {/* Error details (only in dev mode) */}
        {process.env.NODE_ENV === 'development' && error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-left">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm font-semibold text-red-700">Error Details (Dev Mode)</span>
            </div>
            <code className="text-xs text-red-600 break-all">{error.message}</code>
          </div>
        )}

        {/* Refresh Button */}
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={`
            w-full py-4 px-8 rounded-2xl font-semibold text-lg transition-all duration-300 transform
            ${isRefreshing 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 hover:from-blue-600 hover:via-purple-600 hover:to-indigo-700 hover:scale-105 hover:shadow-xl active:scale-95'
            }
            text-white shadow-lg
            flex items-center justify-center gap-3
          `}
        >
          <RefreshCw className={`w-6 h-6 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing Page...' : 'Refresh Page'}
        </button>

        {/* Additional Info */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <AlertCircle className="w-4 h-4" />
            <span>This usually resolves quickly with a refresh</span>
          </div>
          
          {/* Status indicators */}
          <div className="mt-4 flex justify-center gap-4 text-xs text-gray-400">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>UI Active</span>
            </div>
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${isTimeoutError ? 'bg-red-400' : 'bg-orange-400'}`}></div>
              <span>Database {isTimeoutError ? 'Timeout' : 'Issue'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob" style={{animationDelay: '4s'}}></div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
      `}</style>
    </div>
  );
};

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<any>;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Enhanced error detection for database/connection issues
    const isDatabaseError = 
      error.message?.toLowerCase().includes('database') ||
      error.message?.toLowerCase().includes('connection') ||
      error.message?.toLowerCase().includes('timeout') ||
      error.message?.toLowerCase().includes('mongodb') ||
      error.message?.toLowerCase().includes('mongoose') ||
      error.message?.toLowerCase().includes('buffering timed out') ||
      error.message?.toLowerCase().includes('fetch') ||
      error.message?.toLowerCase().includes('network') ||
      error.message?.toLowerCase().includes('server') ||
      error.message?.toLowerCase().includes('pool exhausted') ||
      error.message?.toLowerCase().includes('server temporarily unavailable') ||
      error.message?.toLowerCase().includes('invalid response format');

    console.log('ErrorBoundary: Checking error:', error.message);
    console.log('ErrorBoundary: Is database error?', isDatabaseError);

    if (isDatabaseError) {
      return { hasError: true, error };
    }
    
    // For other errors, let them bubble up normally
    throw error;
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Database error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || RefreshError;
      return <FallbackComponent error={this.state.error} />;
    }

    return this.props.children;
  }
}

// SIMPLIFIED hook - no state to avoid hooks issues
export const useErrorHandler = () => {
  const handleError = React.useCallback((error: Error) => {
    console.error('Manual error trigger:', error);
    // Instead of using state, throw immediately
    throw error;
  }, []);

  return { handleError };
};

export { ErrorBoundary, RefreshError };
export default ErrorBoundary;