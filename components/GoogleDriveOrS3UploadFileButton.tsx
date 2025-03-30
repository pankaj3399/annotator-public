import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import {
  FolderIcon,
  ChevronLeft,
  Database,
  Upload,
  RefreshCw,
  Loader2,
  FileText,
  FileIcon,
  AlertCircle,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Type definitions
interface StorageConnection {
  _id: string;
  storageType: 's3' | 'googleDrive';
  isActive: boolean;
  lastUsed: string | null;
  created_at: string;
  s3Config?: {
    bucketName: string;
    region: string;
    folderPrefix?: string;
  };
  googleDriveConfig?: {
    displayName: string;
    email: string;
  };
}

interface CloudFile {
  id: string;
  name: string;
  type: 'file' | 'folder';
  mimeType?: string;
  size?: number;
  content?: string;
  url?: string;
  lastModified?: string;
  path?: string;
}

interface CloudStorageFileBrowserProps {
  connections: StorageConnection[];
  onSelectFiles?: (fileUrls: string[]) => void;
  disabled?: boolean;
  variant?:
    | 'default'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link'
    | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export default function CloudStorageFileBrowser({
  connections,
  onSelectFiles,
  disabled = false,
  variant = 'outline',
  size = 'default',
  className = '',
}: CloudStorageFileBrowserProps) {
  const { toast } = useToast();

  // Dialog and primary state
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<CloudFile | null>(null);
  const [activeTabValue, setActiveTabValue] = useState<string>('s3');
  const [activeConnectionId, setActiveConnectionId] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Browser navigation state
  const [currentPath, setCurrentPath] = useState('/');
  const [pathHistory, setPathHistory] = useState<string[]>([]);

  // Filter connections by type - use useMemo to avoid recalculations
  const s3Connections = useMemo(() => 
    connections.filter((conn) => conn.storageType === 's3'),
    [connections]
  );
  
  const googleDriveConnections = useMemo(() => 
    connections.filter((conn) => conn.storageType === 'googleDrive'),
    [connections]
  );
  
  const hasConnections = useMemo(() => 
    s3Connections.length > 0 || googleDriveConnections.length > 0,
    [s3Connections, googleDriveConnections]
  );

  // Handle dialog open/close with proper state reset
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        // Reset state when opening
        setSelectedFile(null);
        setFiles([]);
        setCurrentPath('/');
        setPathHistory([]);
        setAuthError(null);

        // Set initial connection and tab
        if (s3Connections.length > 0) {
          setActiveTabValue('s3');
          setActiveConnectionId(s3Connections[0]._id);
        } else if (googleDriveConnections.length > 0) {
          setActiveTabValue('googleDrive');
          setActiveConnectionId(googleDriveConnections[0]._id);
        }
      }

      setIsOpen(open);
    },
    [s3Connections, googleDriveConnections]
  );

  // Shared file utilities
  const getFileIcon = useCallback((file: CloudFile) => {
    if (file.type === 'folder') {
      return <FolderIcon className="h-6 w-6 text-blue-500" />;
    }
    return file.name.toLowerCase().endsWith('.csv') ? (
      <FileText className="h-6 w-6 text-green-700" />
    ) : (
      <FileIcon className="h-6 w-6 text-gray-500" />
    );
  }, []);

  const formatFileSize = useCallback((bytes?: number): string => {
    if (!bytes) return 'Unknown size';

    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }, []);

  // S3 Browser functionality
  const fetchFiles = useCallback(async () => {
    if (!activeConnectionId || activeTabValue !== 's3') return;

    setIsLoading(true);
    setAuthError(null);

    try {
      const apiUrl = `/api/storage/browse?storageId=${activeConnectionId}&path=${encodeURIComponent(currentPath)}`;
      console.log('Sending browse request to:', apiUrl);

      const response = await fetch(apiUrl);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Browse API error:', errorData);
        throw new Error(
          errorData.error || `Failed to fetch files: ${response.status}`
        );
      }

      const data = await response.json();

      // Filter to show only folders and CSV files
      const filteredFiles = (data.files || []).filter((file: CloudFile) => {
        if (file.type === 'folder') return true;
        return file.name.toLowerCase().endsWith('.csv');
      });

      setFiles(filteredFiles);
    } catch (error) {
      console.error('Error fetching files:', error);
      setAuthError(
        error instanceof Error ? error.message : 'Failed to fetch files'
      );
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to fetch files',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [activeConnectionId, activeTabValue, currentPath, toast]);

  // Google Drive browser functionality
  const fetchGoogleDriveFiles = useCallback(async () => {
    if (!activeConnectionId || activeTabValue !== 'googleDrive') return;

    setIsLoading(true);
    setAuthError(null);

    try {
      const apiUrl = `/api/storage/browse?storageId=${activeConnectionId}&path=${encodeURIComponent(currentPath === '/' ? 'root' : currentPath)}`;
      console.log('Sending Google Drive browse request to:', apiUrl);

      const response = await fetch(apiUrl);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Google Drive browse API error:', errorData);
        throw new Error(
          errorData.error || `Failed to fetch Google Drive files: ${response.status}`
        );
      }

      const data = await response.json();
      
      // Filter files to show only folders and CSV files
      const filteredFiles = (data.files || []).filter((file: CloudFile) => {
        if (file.type === 'folder') return true;
        
        const isCsv = file.name.toLowerCase().endsWith('.csv');
        const isGoogleSheet = file.mimeType === 'application/vnd.google-apps.spreadsheet';
        
        return isCsv || isGoogleSheet;
      });
      
      setFiles(filteredFiles);
    } catch (error) {
      console.error('Error fetching Google Drive files:', error);
      setAuthError(
        error instanceof Error ? error.message : 'Failed to fetch Google Drive files'
      );
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to fetch Google Drive files',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [activeConnectionId, activeTabValue, currentPath, toast]);

  // Navigation handlers
  const handleFolderClick = useCallback(
    (folder: CloudFile) => {
      setPathHistory((prev) => [...prev, currentPath]);
      setCurrentPath(folder.path || `${currentPath}${folder.name}/`);
      setSelectedFile(null);
    },
    [currentPath]
  );

  const handleNavigateBack = useCallback(() => {
    if (pathHistory.length === 0) return;

    const prevPath = pathHistory[pathHistory.length - 1];
    setPathHistory((prev) => prev.slice(0, -1));
    setCurrentPath(prevPath);
    setSelectedFile(null);
  }, [pathHistory]);

  // Handle tab change
  const handleTabChange = useCallback(
    (value: string) => {
      setActiveTabValue(value);
      setAuthError(null);

      // Set default connection for the selected tab
      if (value === 's3' && s3Connections.length > 0) {
        setActiveConnectionId(s3Connections[0]._id);
      } else if (value === 'googleDrive' && googleDriveConnections.length > 0) {
        setActiveConnectionId(googleDriveConnections[0]._id);
      }

      // Reset browser state
      setSelectedFile(null);
      setFiles([]);
      setCurrentPath('/');
      setPathHistory([]);
    },
    [s3Connections, googleDriveConnections]
  );

  // Handle connection change
  const handleConnectionChange = useCallback((connectionId: string) => {
    setActiveConnectionId(connectionId);
    setSelectedFile(null);
    setFiles([]);
    setCurrentPath('/');
    setPathHistory([]);
    setAuthError(null);
  }, []);

// In your API route for handling Google Drive files
const handleFileSelect = useCallback(
  (file: CloudFile) => {
    if (file.type === 'folder') {
      handleFolderClick(file);
    } else {
      // For Google Drive files, create a direct API URL
      if (activeTabValue === 'googleDrive' && file.id) {
        // Validate connectionId is a valid ObjectId
        if (!activeConnectionId || activeConnectionId === 'data' || 
            !isValidObjectId(activeConnectionId)) {
          toast({
            title: 'Error',
            description: 'Invalid connection configuration',
            variant: 'destructive',
          });
          return;
        }
        
        const directApiUrl = `/api/storage/connect/google-drive/file?fileId=${file.id}&connectionId=${activeConnectionId}`;
        setSelectedFile({ ...file, url: directApiUrl });
      } else {
        setSelectedFile(file);
      }
    }
  },
  [handleFolderClick, activeTabValue, activeConnectionId, toast]
);

// Helper function to validate ObjectIds
function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}
  // Confirm file selection
  const handleConfirmSelection = useCallback(() => {
    if (!selectedFile) {
      toast({
        title: 'Invalid Selection',
        description: 'Please select a file.',
        variant: 'destructive',
      });
      return;
    }

    if (!activeConnectionId || activeConnectionId === 'data' || 
      !isValidObjectId(activeConnectionId)) {
    toast({
      title: 'Invalid Connection',
      description: 'Storage connection is invalid',
      variant: 'destructive',
    });
    return;
  }


    if (onSelectFiles) {
      // For both S3 and Google Drive, pass the URL to the parent component
      if (selectedFile.url) {
        onSelectFiles([selectedFile.url]);
        
        toast({
          title: 'File Selected',
          description: 'File selected. Now click "Save Tasks" to process it.',
          duration: 5000,
        });
      } else if (selectedFile.content) {
        // For files with direct content (legacy S3 approach)
        const blob = new Blob([selectedFile.content], { type: 'text/csv' });
        const tempUrl = URL.createObjectURL(blob);
        onSelectFiles([tempUrl]);
        
        toast({
          title: 'File Selected',
          description: 'File selected. Now click "Save Tasks" to process it.',
          duration: 5000,
        });
      } else {
        toast({
          title: 'Error',
          description: 'Selected file has no content or URL.',
          variant: 'destructive',
        });
        return;
      }
    }

    // Close this dialog
    setIsOpen(false);
  }, [selectedFile, onSelectFiles, toast]);

  // Load files when connection or path changes - consolidated effect
  useEffect(() => {
    if (isOpen && activeConnectionId) {
      if (activeTabValue === 's3') {
        fetchFiles();
      } else if (activeTabValue === 'googleDrive') {
        fetchGoogleDriveFiles();
      }
    }
  }, [
    isOpen, 
    activeConnectionId, 
    currentPath, 
    fetchFiles, 
    activeTabValue, 
    fetchGoogleDriveFiles
  ]);

  // S3 Browser UI component
  const S3BrowserUI = () => (
    <>
      {authError && (
        <Alert className="mb-4 border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-900">
          <AlertDescription className="flex items-center">
            <AlertCircle className="h-4 w-4 mr-2 text-red-600" />
            <span>{authError}</span>
          </AlertDescription>
        </Alert>
      )}

      {/* Connection selection */}
      {s3Connections.length > 0 && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium">
              Select S3 Bucket
            </label>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchFiles}
              disabled={isLoading}
              type="button"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <select
            className="w-full p-2 border rounded-md"
            value={activeConnectionId}
            onChange={(e) => handleConnectionChange(e.target.value)}
          >
            {s3Connections.map((conn) => (
              <option key={conn._id} value={conn._id}>
                {conn.s3Config?.bucketName || conn._id}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Navigation path */}
      <div className="flex items-center mb-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNavigateBack}
          disabled={pathHistory.length === 0 || isLoading}
          className="mr-2"
          type="button"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-sm bg-gray-100 py-1 px-2 rounded flex-1 overflow-x-auto whitespace-nowrap">
          {currentPath || '/'}
        </div>
      </div>

      {/* File listing */}
      <div className="border rounded-md h-64 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
            <FileIcon className="h-8 w-8 mb-2" />
            <p className="text-center">No files found in this location</p>
          </div>
        ) : (
          <ul className="divide-y">
            {files.map((file) => (
              <li
                key={file.id}
                className={`flex items-center p-2 hover:bg-gray-50 cursor-pointer ${
                  selectedFile && selectedFile.id === file.id
                    ? 'bg-blue-50'
                    : ''
                }`}
                onClick={() => handleFileSelect(file)}
              >
                <div className="mr-3">{getFileIcon(file)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  {file.type === 'file' && (
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)}
                      {file.lastModified
                        ? ` • ${new Date(file.lastModified).toLocaleDateString()}`
                        : ''}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Selected file info */}
      {selectedFile && (
        <div className="mt-4">
          <p className="text-sm font-medium">Selected file:</p>
          <div className="flex items-center gap-2 text-xs py-1 mt-1">
            {getFileIcon(selectedFile)}
            <span className="truncate">{selectedFile.name}</span>
          </div>
        </div>
      )}
    </>
  );

  // Google Drive UI component
  const GoogleDriveUI = () => (
    <>
      {authError && (
        <Alert className="mb-4 border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-900">
          <AlertDescription className="flex items-center">
            <AlertCircle className="h-4 w-4 mr-2 text-red-600" />
            <span>{authError}</span>
          </AlertDescription>
        </Alert>
      )}

      {/* Account selection */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium">
            Select Google Drive Account
          </label>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchGoogleDriveFiles}
            disabled={isLoading}
            type="button"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <select
          className="w-full p-2 border rounded-md"
          value={activeConnectionId}
          onChange={(e) => handleConnectionChange(e.target.value)}
        >
          {googleDriveConnections.map((conn) => (
            <option key={conn._id} value={conn._id}>
              {conn.googleDriveConfig?.email || conn._id}
            </option>
          ))}
        </select>
      </div>

      {/* Navigation path */}
      <div className="flex items-center mb-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNavigateBack}
          disabled={pathHistory.length === 0 || isLoading}
          className="mr-2"
          type="button"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-sm bg-gray-100 py-1 px-2 rounded flex-1 overflow-x-auto whitespace-nowrap">
          {currentPath === '/' ? 'Root' : currentPath}
        </div>
      </div>

      {/* File listing */}
      <div className="border rounded-md h-64 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
            <FileIcon className="h-8 w-8 mb-2" />
            <p className="text-center">No files found in this location</p>
          </div>
        ) : (
          <ul className="divide-y">
            {files.map((file) => (
              <li
                key={file.id}
                className={`flex items-center p-2 hover:bg-gray-50 cursor-pointer ${
                  selectedFile && selectedFile.id === file.id
                    ? 'bg-blue-50'
                    : ''
                }`}
                onClick={() => handleFileSelect(file)}
              >
                <div className="mr-3">{getFileIcon(file)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  {file.type === 'file' && (
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)}
                      {file.lastModified
                        ? ` • ${new Date(file.lastModified).toLocaleDateString()}`
                        : ''}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Selected file info */}
      {selectedFile && (
        <div className="mt-4">
          <p className="text-sm font-medium">Selected file:</p>
          <div className="flex items-center gap-2 text-xs py-1 px-2 mt-1 bg-gray-50 rounded border">
            {getFileIcon(selectedFile)}
            <span className="truncate flex-1">{selectedFile.name}</span>
            {selectedFile.size && (
              <span className="text-gray-500">
                {formatFileSize(selectedFile.size)}
              </span>
            )}
          </div>
        </div>
      )}
    </>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          className={`bg-black text-white hover:bg-black/90 ${className}`}
          size={size}
          disabled={disabled}
          variant={variant}
        >
          <Upload className="mr-2 h-4 w-4" />
          Import CSV from Cloud
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Select CSV File</DialogTitle>
          <DialogDescription>
            Browse and select a CSV file from your connected cloud storage.
          </DialogDescription>
        </DialogHeader>

        {!hasConnections ? (
          <div className="flex flex-col items-center justify-center py-6">
            <Database className="h-10 w-10 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-center">
              No storage connected
            </h3>
            <p className="text-sm text-gray-500 text-center mt-2 mb-4">
              You need to set up at least one storage provider first.
            </p>
          </div>
        ) : (
          <>
            <Tabs
              value={activeTabValue}
              className="w-full"
              onValueChange={handleTabChange}
              defaultValue="s3"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="s3" disabled={s3Connections.length === 0}>
                  Amazon S3
                </TabsTrigger>
                <TabsTrigger
                  value="googleDrive"
                  disabled={googleDriveConnections.length === 0}
                >
                  Google Drive
                </TabsTrigger>
              </TabsList>

              <TabsContent value="s3">
                <Card>
                  <CardContent className="pt-4">
                    <S3BrowserUI />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="googleDrive">
                <Card>
                  <CardContent className="pt-4">
                    <GoogleDriveUI />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-4">
              <Button
                className="bg-black text-white hover:bg-black/90"
                onClick={handleConfirmSelection}
                disabled={!selectedFile || authError !== null}
                type="button"
              >
                Import Selected CSV
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}