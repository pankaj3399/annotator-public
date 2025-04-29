'use client'

import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  Copy, 
  CheckCircle, 
  Loader, 
  Database,
  FileIcon,
  FolderIcon,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  Send,
  ExternalLink,
  Menu,
  X
} from 'lucide-react';
import { sendCSVToJupyterLite, setupJupyterListener } from '@/lib/jupyterCommunication';

// Define interfaces for our data structures
interface StorageConnection {
  _id: string;
  storageType: 's3' | 'googleDrive';
  s3Config?: {
    bucketName: string;
  };
  googleDriveConfig?: {
    email: string;
  };
}

interface CloudFile {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path?: string;
  size?: number;
  lastModified?: string;
  mimeType?: string;
}

const DataAnalysisComponent = () => {
  // File states
  const [file, setFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [jupyterReady, setJupyterReady] = useState<boolean>(false);
  const [jupyterMode, setJupyterMode] = useState<'repl' | 'lab'>('repl');
  const [showPreview, setShowPreview] = useState<boolean>(false);
  
  // Cloud storage states
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [connections, setConnections] = useState<StorageConnection[]>([]);
  const [activeTabValue, setActiveTabValue] = useState<'s3' | 'googleDrive'>('s3');
  const [activeConnectionId, setActiveConnectionId] = useState<string>('');
  const [currentPath, setCurrentPath] = useState<string>('/');
  const [pathHistory, setPathHistory] = useState<string[]>([]);
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [selectedCloudFile, setSelectedCloudFile] = useState<CloudFile | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [cloudLoading, setCloudLoading] = useState<boolean>(false);
  
  // Filter connections by type
  const s3Connections = connections.filter(conn => conn.storageType === 's3');
  const googleDriveConnections = connections.filter(conn => conn.storageType === 'googleDrive');
  const hasConnections = s3Connections.length > 0 || googleDriveConnections.length > 0;
  
  // JupyterLite URLs
  const jupyterReplUrl = '/jupyterlite/repl/index.html?kernel=python&toolbar=1';
  const jupyterLabUrl = '/jupyterlite/lab/index.html';
  
  // Fetch storage connections on component mount
  useEffect(() => {
    const fetchConnections = async () => {
      try {
        const response = await fetch('/api/storage/connections');
        if (response.ok) {
          const data = await response.json();
          setConnections(data.connections || []);
          
          // Set default connection and tab
          if (data.connections?.length > 0) {
            const s3Conns = data.connections.filter((c: StorageConnection) => c.storageType === 's3');
            const googleConns = data.connections.filter((c: StorageConnection) => c.storageType === 'googleDrive');
            
            if (s3Conns.length > 0) {
              setActiveTabValue('s3');
              setActiveConnectionId(s3Conns[0]._id);
            } else if (googleConns.length > 0) {
              setActiveTabValue('googleDrive');
              setActiveConnectionId(googleConns[0]._id);
            }
          }
        } else {
          console.error('Failed to fetch connections');
        }
      } catch (err) {
        console.error('Error fetching connections:', err);
      }
    };
    
    fetchConnections();
  }, []);
  
  // Setup JupyterLite communication
  useEffect(() => {
    // Set up message listener for communication with JupyterLite
    const cleanup = setupJupyterListener((data) => {
      console.log('Received message from JupyterLite:', data);
      // You can handle specific messages here if needed
    });
    
    // Add a load event listener to detect when JupyterLite is ready
    const handleIframeLoad = () => {
      console.log('JupyterLite iframe loaded');
      setJupyterReady(true);
    };
    
    const iframe = iframeRef.current;
    if (iframe) {
      iframe.addEventListener('load', handleIframeLoad);
    }
    
    return () => {
      cleanup();
      if (iframe) {
        iframe.removeEventListener('load', handleIframeLoad);
      }
    };
  }, []);
  
  // Send data to JupyterLite when CSV content changes
  useEffect(() => {
    if (jupyterReady && csvContent && iframeRef.current) {
      sendCSVToJupyterLite(
        iframeRef.current, 
        csvContent, 
        file?.name || selectedCloudFile?.name || 'data.csv'
      ).catch(err => {
        console.error('Error sending CSV to JupyterLite:', err);
        setError('Failed to send data to JupyterLite');
      });
    }
  }, [jupyterReady, csvContent, file, selectedCloudFile]);
  
  // Toggle between JupyterLite modes (REPL vs Lab)
  const toggleJupyterMode = () => {
    setJupyterMode(prev => prev === 'repl' ? 'lab' : 'repl');
    setJupyterReady(false); // Reset ready state since we're changing the iframe source
  };
  
  // Handle file selection from local device
  const handleFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setFile(files[0]);
      setSelectedCloudFile(null);
      setLoading(true);
      setCsvContent('');
      
      // Read the file content
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        const content = e.target?.result;
        if (typeof content === 'string') {
          setCsvContent(content);
        }
        setLoading(false);
      };
      reader.onerror = () => {
        setError("Failed to read the file");
        setLoading(false);
      };
      reader.readAsText(files[0]);
    }
  };
  
  // Handle cloud storage file browser
  const openCloudFileBrowser = () => {
    setIsDialogOpen(true);
    setCurrentPath('/');
    setPathHistory([]);
    setFiles([]);
    setSelectedCloudFile(null);
    setAuthError(null);
  };
  
  const closeCloudFileBrowser = () => {
    setIsDialogOpen(false);
  };
  
  const handleTabChange = (value: 's3' | 'googleDrive') => {
    setActiveTabValue(value);
    setAuthError(null);
    
    // Set default connection for the selected tab
    if (value === 's3' && s3Connections.length > 0) {
      setActiveConnectionId(s3Connections[0]._id);
    } else if (value === 'googleDrive' && googleDriveConnections.length > 0) {
      setActiveConnectionId(googleDriveConnections[0]._id);
    }
    
    // Reset browser state
    setSelectedCloudFile(null);
    setFiles([]);
    setCurrentPath('/');
    setPathHistory([]);
  };
  
  const handleConnectionChange = (connectionId: string) => {
    setActiveConnectionId(connectionId);
    setSelectedCloudFile(null);
    setFiles([]);
    setCurrentPath('/');
    setPathHistory([]);
    setAuthError(null);
  };
  
  // Fetch files from cloud storage
  const fetchCloudFiles = async () => {
    if (!activeConnectionId) return;
    
    setCloudLoading(true);
    setAuthError(null);
    
    try {
      const apiPath = activeTabValue === 'googleDrive' && currentPath === '/' ? 'root' : currentPath;
      const apiUrl = `/api/storage/browse?storageId=${activeConnectionId}&path=${encodeURIComponent(apiPath)}`;
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch files: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Filter to show only folders and CSV files
      const filteredFiles = (data.files || []).filter((file: CloudFile) => {
        if (file.type === 'folder') return true;
        
        const isCsv = file.name.toLowerCase().endsWith('.csv');
        const isGoogleSheet = file.mimeType === 'application/vnd.google-apps.spreadsheet';
        
        return isCsv || isGoogleSheet;
      });
      
      setFiles(filteredFiles);
    } catch (error) {
      console.error('Error fetching files:', error);
      setAuthError(error instanceof Error ? error.message : 'Failed to fetch files');
    } finally {
      setCloudLoading(false);
    }
  };
  
  // Load files when connection or path changes
  useEffect(() => {
    if (isDialogOpen && activeConnectionId) {
      fetchCloudFiles();
    }
  }, [isDialogOpen, activeConnectionId, currentPath]);
  
  // Handle file selection from cloud
  const handleCloudFileSelect = (file: CloudFile) => {
    if (file.type === 'folder') {
      setPathHistory(prev => [...prev, currentPath]);
      setCurrentPath(file.path || `${currentPath}${file.name}/`);
      setSelectedCloudFile(null);
      return;
    }
    
    setSelectedCloudFile(file);
  };
  
  const handleNavigateBack = () => {
    if (pathHistory.length === 0) return;
    
    const prevPath = pathHistory[pathHistory.length - 1];
    setPathHistory(prev => prev.slice(0, -1));
    setCurrentPath(prevPath);
    setSelectedCloudFile(null);
  };
  
  // Import selected cloud file
  const importSelectedCloudFile = async () => {
    if (!selectedCloudFile) {
      setError('No file selected');
      return;
    }
    
    try {
      setLoading(true);
      setCsvContent('');
      setFile(null);
      
      let content = '';
      
      // For Google Drive files, create a direct API URL
      if (activeTabValue === 'googleDrive' && selectedCloudFile.id) {
        const apiUrl = `/api/storage/connect/google-drive/file?fileId=${selectedCloudFile.id}&connectionId=${activeConnectionId}`;
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          throw new Error('Failed to fetch file from Google Drive');
        }
        
        content = await response.text();
      } else {
        // For S3 files
        const apiUrl = `/api/storage/file?storageId=${activeConnectionId}&fileId=${selectedCloudFile.id}`;
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          throw new Error('Failed to fetch file from S3');
        }
        
        content = await response.text();
      }
      
      setCsvContent(content);
      
      // Close the dialog
      setIsDialogOpen(false);
    } catch (err) {
      console.error('Error importing file:', err);
      setError(err instanceof Error ? err.message : 'Failed to import file');
    } finally {
      setLoading(false);
    }
  };

  // Handle copy to clipboard
  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(csvContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError("Failed to copy to clipboard");
    }
  };
  
  // Toggle CSV preview panel
  const togglePreview = () => {
    setShowPreview(!showPreview);
  };
  
  // Utility function to get file icon
  const getFileIcon = (file: CloudFile) => {
    if (file.type === 'folder') {
      return <FolderIcon className="h-5 w-5 text-blue-500" />;
    }
    return file.name.toLowerCase().endsWith('.csv') ? (
      <FileText className="h-5 w-5 text-green-600" />
    ) : (
      <FileIcon className="h-5 w-5 text-gray-500" />
    );
  };
  
  // Utility function to format file size
  const formatFileSize = (bytes: number | undefined) => {
    if (!bytes) return 'Unknown size';
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col">
      <header className="bg-white border-b p-4 shadow-sm">
        <div className="container mx-auto">
          <h1 className="text-xl font-bold text-gray-800">Data Analysis Workspace</h1>
        </div>
      </header>

      {/* Control Panel Header */}
      <div className="bg-white border-b shadow-sm py-2">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Source Selection Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleFileUpload}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors"
              >
                <Upload className="h-4 w-4" />
                <span>Upload</span>
              </button>
              
              <button
                onClick={openCloudFileBrowser}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 hover:bg-gray-50 rounded-md text-sm font-medium transition-colors"
              >
                <Database className="h-4 w-4" />
                <span>Cloud Storage</span>
              </button>
              
              {/* Hidden File Input */}
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileChange}
                accept=".csv,.xlsx,.xls,.txt,.json"
              />
            </div>
            
            {/* File Preview Button (shows when file is loaded) */}
            {csvContent && (
              <button
                onClick={togglePreview}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 hover:bg-gray-50 rounded-md text-sm font-medium transition-colors"
              >
                <FileText className="h-4 w-4" />
                <span>{showPreview ? 'Hide Preview' : 'Show Preview'}</span>
              </button>
            )}
            
            {/* Selected File Display */}
            {loading ? (
              <div className="flex items-center gap-2 ml-auto px-3 py-1.5 bg-indigo-50 rounded-md">
                <Loader className="h-4 w-4 text-indigo-500 animate-spin" />
                <span className="text-sm text-indigo-600">Loading...</span>
              </div>
            ) : csvContent ? (
              <div className="flex items-center gap-2 ml-auto">
                <div className="flex items-center px-3 py-1.5 bg-indigo-50 rounded-md">
                  <FileText className="h-4 w-4 text-indigo-600 mr-2" />
                  <span className="text-sm font-medium text-gray-800 truncate max-w-xs">
                    {file?.name || selectedCloudFile?.name || "CSV Data"}
                  </span>
                </div>
                
                      
                <button
                  onClick={handleCopyToClipboard}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    copied
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {copied ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      <span>Copy CSV</span>
                    </>
                  )}
                </button>
              </div>
            ) : null}
            
            {/* Jupyter Mode Selector */}
            <div className="ml-auto flex items-center gap-2">
              <div className="flex items-center">
                <span className="text-sm text-gray-600 mr-2">Mode:</span>
                <select
                  value={jupyterMode}
                  onChange={(e) => setJupyterMode(e.target.value as 'repl' | 'lab')}
                  className="text-sm border border-gray-300 rounded px-2 py-1.5 bg-white"
                >
                  <option value="repl">REPL Console</option>
                  <option value="lab">JupyterLab</option>
                </select>
              </div>
              
              <button
                onClick={() => window.open(jupyterMode === 'repl' ? jupyterReplUrl : jupyterLabUrl, '_blank')}
                className="flex items-center gap-1.5 px-2 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Open in New Tab</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CSV Preview Panel (conditional) */}
      {showPreview && csvContent && (
        <div className="bg-white border-b shadow-sm py-3">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-medium text-gray-800">CSV Preview</h4>
              <button onClick={togglePreview} className="text-gray-500 hover:text-gray-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs font-mono whitespace-pre-wrap max-h-64 overflow-y-auto">
              {csvContent.slice(0, 500)}
              {csvContent.length > 500 ? '...' : ''}
            </div>
            <p className="text-xs text-gray-500 mt-1 italic">
              CSV data will be automatically sent to Jupyter when loaded
            </p>
          </div>
        </div>
      )}

      {/* Main Jupyter Area - Now taking full width */}
      <div className="flex-grow container mx-auto px-4 py-4">
        <div className="bg-white rounded-xl shadow-sm p-5 h-full min-h-[700px] border border-gray-100">
          <iframe
            ref={iframeRef}
            src={jupyterMode === 'repl' ? jupyterReplUrl : jupyterLabUrl}
            width="100%"
            height="100%"
            style={{ border: 'none', minHeight: '700px', borderRadius: '0.5rem' }}
            allow="clipboard-read; clipboard-write"
          ></iframe>
        </div>
      </div>
        
      {/* Cloud File Browser Dialog */}
      {isDialogOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-lg w-full">
            <div className="p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Select CSV File</h3>
                <button 
                  onClick={closeCloudFileBrowser}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
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
                  {/* Tab Selection */}
                  <div className="flex border-b mb-4">
                    <button
                      onClick={() => handleTabChange('s3')}
                      className={`px-4 py-2 font-medium text-sm ${
                        activeTabValue === 's3'
                          ? 'text-indigo-600 border-b-2 border-indigo-600'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                      disabled={s3Connections.length === 0}
                    >
                      Amazon S3
                    </button>
                    <button
                      onClick={() => handleTabChange('googleDrive')}
                      className={`px-4 py-2 font-medium text-sm ${
                        activeTabValue === 'googleDrive'
                          ? 'text-indigo-600 border-b-2 border-indigo-600'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                      disabled={googleDriveConnections.length === 0}
                    >
                      Google Drive
                    </button>
                  </div>
                  
                  {/* Connection Selection */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium">
                        Select {activeTabValue === 's3' ? 'S3 Bucket' : 'Google Drive Account'}
                      </label>
                      <button
                        onClick={fetchCloudFiles}
                        disabled={cloudLoading}
                        className="p-1 rounded-md hover:bg-gray-100"
                      >
                        <RefreshCw className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                    <select
                      className="w-full p-2 border rounded-md"
                      value={activeConnectionId}
                      onChange={(e) => handleConnectionChange(e.target.value)}
                    >
                      {(activeTabValue === 's3' ? s3Connections : googleDriveConnections).map((conn) => (
                        <option key={conn._id} value={conn._id}>
                          {activeTabValue === 's3'
                            ? conn.s3Config?.bucketName || conn._id
                            : conn.googleDriveConfig?.email || conn._id}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Error Alert */}
                  {authError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
                      <div className="flex">
                        <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />
                        <span>{authError}</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Navigation Path */}
                  <div className="flex items-center mb-2">
                    <button
                      onClick={handleNavigateBack}
                      disabled={pathHistory.length === 0 || cloudLoading}
                      className="p-1 rounded-md hover:bg-gray-100 mr-2 disabled:opacity-50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <div className="text-sm bg-gray-100 py-1 px-2 rounded flex-1 overflow-x-auto whitespace-nowrap">
                      {activeTabValue === 'googleDrive' && currentPath === '/' ? 'Root' : currentPath || '/'}
                    </div>
                  </div>
                  
                  {/* File Listing */}
                  <div className="border rounded-md h-64 overflow-y-auto">
                    {cloudLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader className="h-6 w-6 animate-spin text-indigo-500" />
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
                            className={`flex items-center p-2.5 hover:bg-gray-50 cursor-pointer ${
                              selectedCloudFile && selectedCloudFile.id === file.id
                                ? 'bg-indigo-50'
                                : ''
                            }`}
                            onClick={() => handleCloudFileSelect(file)}
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
                  
                  {/* Selected File Info */}
                  {selectedCloudFile && (
                    <div className="mt-4">
                      <p className="text-sm font-medium">Selected file:</p>
                      <div className="flex items-center gap-2 p-2 mt-1 bg-gray-50 rounded border">
                        {getFileIcon(selectedCloudFile)}
                        <span className="text-sm truncate flex-1">{selectedCloudFile.name}</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Dialog Footer */}
                  <div className="mt-6 flex justify-end gap-2">
                    <button
                      onClick={closeCloudFileBrowser}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={importSelectedCloudFile}
                      disabled={!selectedCloudFile || selectedCloudFile.type === 'folder' || cloudLoading || Boolean(authError)}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium disabled:bg-indigo-300"
                    >
                      Import Selected CSV
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg max-w-md animate-fade-in">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button
                  onClick={() => setError(null)}
                  className="inline-flex bg-red-50 rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none"
                >
                  <span className="sr-only">Dismiss</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataAnalysisComponent;