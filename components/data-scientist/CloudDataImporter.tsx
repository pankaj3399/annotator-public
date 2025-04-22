'use client'

import React, { useState, useEffect } from 'react';
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
  Loader2,
  FileText,
  FileIcon,
  AlertCircle,
  Cloud,
  RefreshCw
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

interface CloudDataImporterProps {
  onFileSelected: (content: string, filename: string) => void;
  className?: string;
}

export default function CloudDataImporter({
  onFileSelected,
  className = '',
}: CloudDataImporterProps) {
  const { toast } = useToast();

  // Dialog and primary state
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<CloudFile | null>(null);
  const [activeTabValue, setActiveTabValue] = useState<string>('s3');
  const [activeConnectionId, setActiveConnectionId] = useState<string>('');
  const [connections, setConnections] = useState<StorageConnection[]>([]);
  const [authError, setAuthError] = useState<string | null>(null);
  const [importInProgress, setImportInProgress] = useState(false);

  // Browser navigation state
  const [currentPath, setCurrentPath] = useState('/');
  const [pathHistory, setPathHistory] = useState<string[]>([]);

  // Fetch all storage connections on component mount
  useEffect(() => {
    async function fetchConnections() {
      try {
        const response = await fetch('/api/storage/connections');
        if (!response.ok) {
          throw new Error('Failed to fetch storage connections');
        }
        const data = await response.json();
        setConnections(data.connections || []);
      } catch (error) {
        console.error('Error fetching connections:', error);
        toast({
          title: 'Error',
          description: 'Failed to load storage connections',
          variant: 'destructive',
        });
      }
    }

    fetchConnections();
  }, [toast]);

  // Filter connections by type
  const s3Connections = connections.filter((conn) => conn.storageType === 's3');
  const googleDriveConnections = connections.filter(
    (conn) => conn.storageType === 'googleDrive'
  );
  const hasConnections = s3Connections.length > 0 || googleDriveConnections.length > 0;

  // Handle dialog open/close with proper state reset
  const handleOpenChange = (open: boolean) => {
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
  };

  // Shared file utilities
  const getFileIcon = (file: CloudFile) => {
    if (file.type === 'folder') {
      return <FolderIcon className="h-6 w-6 text-blue-500" />;
    }
    return file.name.toLowerCase().endsWith('.csv') ? (
      <FileText className="h-6 w-6 text-green-700" />
    ) : (
      <FileIcon className="h-6 w-6 text-gray-500" />
    );
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown size';

    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Browser fetch functionality 
  const fetchFiles = async () => {
    if (!activeConnectionId) return;

    setIsLoading(true);
    setAuthError(null);

    try {
      const storageType = activeTabValue;
      const apiUrl = `/api/storage/browse?storageId=${activeConnectionId}&path=${encodeURIComponent(
        storageType === 'googleDrive' && currentPath === '/' ? 'root' : currentPath
      )}`;
      
      const response = await fetch(apiUrl);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Failed to fetch files: ${response.status}`
        );
      }

      const data = await response.json();

      // Filter to show only folders and CSV files
      const filteredFiles = (data.files || []).filter((file: CloudFile) => {
        if (file.type === 'folder') return true;
        
        // Only allow CSV files or Google Sheets (which can be exported as CSV)
        const lowerName = file.name.toLowerCase();
        return lowerName.endsWith('.csv') || 
               file.mimeType === 'application/vnd.google-apps.spreadsheet';
      });

      setFiles(filteredFiles);
    } catch (error) {
      console.error('Error fetching files:', error);
      setAuthError(
        error instanceof Error ? error.message : 'Failed to fetch files'
      );
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch files',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Navigation handlers
  const handleFolderClick = (folder: CloudFile) => {
    setPathHistory((prev) => [...prev, currentPath]);
    setCurrentPath(folder.path || `${currentPath}${folder.name}/`);
    setSelectedFile(null);
  };

  const handleNavigateBack = () => {
    if (pathHistory.length === 0) return;

    const prevPath = pathHistory[pathHistory.length - 1];
    setPathHistory((prev) => prev.slice(0, -1));
    setCurrentPath(prevPath);
    setSelectedFile(null);
  };

  // Handle tab change
  const handleTabChange = (value: string) => {
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
  };

  // Handle connection change
  const handleConnectionChange = (connectionId: string) => {
    setActiveConnectionId(connectionId);
    setSelectedFile(null);
    setFiles([]);
    setCurrentPath('/');
    setPathHistory([]);
    setAuthError(null);
  };

  // Helper function to validate ObjectIds
  function isValidObjectId(id: string): boolean {
    return /^[0-9a-fA-F]{24}$/.test(id);
  }

  // Handle file selection
  const handleFileSelect = (file: CloudFile) => {
    if (file.type === 'folder') {
      handleFolderClick(file);
    } else {
      setSelectedFile(file);
    }
  };

  // Import the file
  const importFile = async () => {
    if (!selectedFile) {
      toast({
        title: 'Error',
        description: 'No file selected',
        variant: 'destructive',
      });
      return;
    }

    setImportInProgress(true);

    try {
      // Either use direct URL or generate one for Google Drive files
      const url = selectedFile.url || 
        (activeTabValue === 'googleDrive' && selectedFile.id 
          ? `/api/storage/connect/google-drive/file?fileId=${selectedFile.id}&connectionId=${activeConnectionId}${
              selectedFile.mimeType === 'application/vnd.google-apps.spreadsheet' ? '&export=csv' : ''
            }`
          : null);

      if (!url) {
        throw new Error('Unable to determine file URL');
      }

      // Fetch the file content directly
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.status}`);
      }
      
      const fileContent = await response.text();
      
      // For Google Sheets, ensure filename ends with .csv
      let fileName = selectedFile.name;
      if (selectedFile.mimeType === 'application/vnd.google-apps.spreadsheet' && !fileName.toLowerCase().endsWith('.csv')) {
        fileName = `${fileName}.csv`;
      }

      // Pass the file content back through the callback
      onFileSelected(fileContent, fileName);

      // Close the dialog
      setIsOpen(false);
    } catch (error) {
      console.error('Error importing file:', error);
      toast({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'Failed to import file',
        variant: 'destructive',
      });
    } finally {
      setImportInProgress(false);
    }
  };

  // Load files when connection or path changes
  useEffect(() => {
    if (isOpen && activeConnectionId) {
      fetchFiles();
    }
  }, [isOpen, activeConnectionId, currentPath]);

  // Browser UI component
  const FileBrowserUI = () => (
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
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium">
            {activeTabValue === 's3' ? 'Select S3 Bucket' : 'Select Google Drive Account'}
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
          {activeTabValue === 's3'
            ? s3Connections.map((conn) => (
                <option key={conn._id} value={conn._id}>
                  {conn.s3Config?.bucketName || conn._id}
                </option>
              ))
            : googleDriveConnections.map((conn) => (
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
          {activeTabValue === 'googleDrive' && currentPath === '/'
            ? 'Root'
            : currentPath || '/'}
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
          className={`bg-indigo-600 text-white hover:bg-indigo-700 ${className}`}
          size="default"
        >
          <Cloud className="mr-2 h-4 w-4" />
          Import CSV from Cloud
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import CSV for Analysis</DialogTitle>
          <DialogDescription>
            Browse and select a CSV file from your connected cloud storage for data analysis.
          </DialogDescription>
        </DialogHeader>

        {!hasConnections ? (
          <div className="flex flex-col items-center justify-center py-6">
            <Database className="h-10 w-10 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-center">
              No storage connected
            </h3>
            <p className="text-sm text-gray-500 text-center mt-2 mb-4">
              You need to set up at least one storage provider in your account settings.
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
                    <FileBrowserUI />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="googleDrive">
                <Card>
                  <CardContent className="pt-4">
                    <FileBrowserUI />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-4">
              <Button
                className="bg-indigo-600 text-white hover:bg-indigo-700"
                onClick={importFile}
                disabled={!selectedFile || authError !== null || importInProgress}
                type="button"
              >
                {importInProgress ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  'Import CSV'
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}