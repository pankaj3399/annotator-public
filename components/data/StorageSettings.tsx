"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { UploadCloud, CloudUpload, FileUp, Database, Plus, Check, Trash2 } from "lucide-react";

interface StorageConnection {
  _id: string;
  storageType: string;
  isActive: boolean;
  lastUsed: string | null;
  created_at: string;
  // S3 specific fields
  s3Config?: {
    bucketName: string;
    region: string;
    folderPrefix?: string;
  };
  // Google Drive specific fields
  googleDriveConfig?: {
    displayName: string;
    email: string;
  };
}

export default function StorageSettingsPage() {
  const { data: session, status } = useSession();
  const [connections, setConnections] = useState<StorageConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingS3, setIsAddingS3] = useState(false);
  const [isConnectingGoogleDrive, setIsConnectingGoogleDrive] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [showS3Alert, setShowS3Alert] = useState(false);
  const [showGDriveAlert, setShowGDriveAlert] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [connectionToDelete, setConnectionToDelete] = useState<StorageConnection | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Form state for S3
  const [s3Form, setS3Form] = useState({
    bucketName: "",
    region: process.env.NEXT_PUBLIC_AWS_REGION || "us-east-1",
    folderPrefix: "",
    accessKeyId: "",
    secretAccessKey: ""
  });
  
  // Handle tab clicks to show alerts only when needed
  const handleS3TabClick = () => {
    if (s3Connections.length > 0) {
      setShowS3Alert(true);
    } else {
      setShowS3Alert(false);
    }
  };

  const handleGDriveTabClick = () => {
    if (googleDriveConnections.length > 0) {
      setShowGDriveAlert(true);
    } else {
      setShowGDriveAlert(false);
    }
  };

  // Show delete confirmation dialog
  const confirmDeleteConnection = (connection: StorageConnection) => {
    setConnectionToDelete(connection);
    setDeleteDialogOpen(true);
  };

  // Check for status from OAuth redirects
  useEffect(() => {
    const status = searchParams?.get('status');
    const provider = searchParams?.get('provider');
    const message = searchParams?.get('message');

    if (status === 'success' && provider) {
      toast({
        title: "Connection Successful",
        description: `Your ${provider === 'google-drive' ? 'Google Drive' : 'S3'} account has been connected.`,
      });
      
      // Clean up URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      
      // Refresh connections list
      fetchConnections();
    } else if (status === 'error') {
      toast({
        title: "Connection Failed",
        description: message || "An error occurred during the connection process.",
        variant: "destructive",
      });
      
      // Clean up URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams, toast]);

  // Fetch user's storage connections
  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    fetchConnections();
  }, [status, router, toast]);

  const fetchConnections = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/storage/connections");
      if (response.ok) {
        const data = await response.json();
        setConnections(data.connections || []);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch storage connections",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching connections:", error);
      toast({
        title: "Error",
        description: "Something went wrong while fetching your connections.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddS3 = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsAddingS3(true);
      
      const response = await fetch("/api/storage/connect/s3", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(s3Form),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add S3 connection");
      }

      const data = await response.json();
      
      toast({
        title: "Success",
        description: "S3 bucket connected successfully",
      });

      // Refresh the connections list
      fetchConnections();
      
      // Reset form
      setS3Form({
        bucketName: "",
        region: process.env.NEXT_PUBLIC_AWS_REGION || "us-east-1",
        folderPrefix: "",
        accessKeyId: "",
        secretAccessKey: ""
      });
      
    } catch (error) {
      console.error("Error adding S3 connection:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add S3 connection",
        variant: "destructive",
      });
    } finally {
      setIsAddingS3(false);
    }
  };

  const handleConnectGoogleDrive = async () => {
    setIsConnectingGoogleDrive(true);
    try {
      // Redirect user to Google OAuth flow
      window.location.href = "/api/storage/connect/google-drive";
    } catch (error) {
      console.error("Error connecting to Google Drive:", error);
      toast({
        title: "Error",
        description: "Failed to initiate Google Drive connection",
        variant: "destructive",
      });
      setIsConnectingGoogleDrive(false);
    }
  };

  const handleDeleteConnection = async (connectionId: string) => {
    try {
      setIsDeleting(connectionId);
      
      const response = await fetch(`/api/storage/connections/${connectionId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete connection");
      }
      
      toast({
        title: "Success",
        description: "Storage connection deleted successfully",
      });

      // Remove from the list
      setConnections(prev => prev.filter(conn => conn._id !== connectionId));
      
    } catch (error) {
      console.error("Error deleting connection:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete connection",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  // Filter connections by type
  const s3Connections = connections.filter(conn => conn.storageType === 's3');
  const googleDriveConnections = connections.filter(conn => conn.storageType === 'googleDrive');

  if (status === "loading" || isLoading) {
    return (
      <div className="container mx-auto py-10 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Storage Settings</h1>
      
      <div className="grid grid-cols-1 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Your Storage Connections</CardTitle>
            <CardDescription>
              Connect your cloud storage services to upload and manage files.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {connections.length === 0 ? (
              <div className="text-center py-8">
                <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium">No storage connected</h3>
                <p className="text-sm text-gray-500 mt-2 mb-4">
                  Add your first cloud storage connection to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* S3 Connections Section */}
                {s3Connections.length > 0 && (
                  <div>
                    <h3 className="text-md font-medium mb-3 flex items-center">
                      <UploadCloud className="h-5 w-5 mr-2 text-blue-500" />
                      Amazon S3 Connections
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                      {s3Connections.map((connection) => (
                        <Card key={connection._id} className="border border-blue-100 bg-blue-50 dark:bg-blue-950 dark:border-blue-900">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="space-y-1">
                                <div className="flex items-center">
                                  <h4 className="font-semibold">{connection.s3Config?.bucketName}</h4>
                                  {connection.isActive && (
                                    <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 text-xs rounded-full flex items-center">
                                      <Check className="h-3 w-3 mr-1" />
                                      Active
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-300">
                                  <p><span className="font-medium">Region:</span> {connection.s3Config?.region}</p>
                                  {connection.s3Config?.folderPrefix && (
                                    <p><span className="font-medium">Folder:</span> {connection.s3Config.folderPrefix}</p>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  <p>Added: {new Date(connection.created_at).toLocaleDateString()}</p>
                                  {connection.lastUsed && (
                                    <p>Last used: {new Date(connection.lastUsed).toLocaleDateString()}</p>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => confirmDeleteConnection(connection)}
                                disabled={isDeleting === connection._id}
                              >
                                {isDeleting === connection._id ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Google Drive Connections Section */}
                {googleDriveConnections.length > 0 && (
                  <div>
                    <h3 className="text-md font-medium mb-3 flex items-center">
                      <CloudUpload className="h-5 w-5 mr-2 text-green-500" />
                      Google Drive Connections
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                      {googleDriveConnections.map((connection) => (
                        <Card key={connection._id} className="border border-green-100 bg-green-50 dark:bg-green-950 dark:border-green-900">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="space-y-1">
                                <div className="flex items-center">
                                  <h4 className="font-semibold">{connection.googleDriveConfig?.displayName}</h4>
                                  {connection.isActive && (
                                    <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 text-xs rounded-full flex items-center">
                                      <Check className="h-3 w-3 mr-1" />
                                      Active
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-300">
                                  <p><span className="font-medium">Email:</span> {connection.googleDriveConfig?.email}</p>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  <p>Added: {new Date(connection.created_at).toLocaleDateString()}</p>
                                  {connection.lastUsed && (
                                    <p>Last used: {new Date(connection.lastUsed).toLocaleDateString()}</p>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => confirmDeleteConnection(connection)}
                                disabled={isDeleting === connection._id}
                              >
                                {isDeleting === connection._id ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Add New Storage</h2>
        
        <Tabs defaultValue="s3" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="s3" onClick={handleS3TabClick}>Amazon S3</TabsTrigger>
            <TabsTrigger value="googleDrive" onClick={handleGDriveTabClick}>Google Drive</TabsTrigger>
          </TabsList>
          
          <TabsContent value="s3">
            <Card>
              <CardHeader>
                <CardTitle>Connect Amazon S3</CardTitle>
                <CardDescription>
                  Enter your S3 bucket information and credentials to connect.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {showS3Alert && s3Connections.length > 0 && (
                  <Alert className="mb-4 border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-900">
                    <AlertDescription className="flex items-center">
                      <div className="shrink-0 mr-2 p-1 rounded-full bg-amber-100 dark:bg-amber-900">
                        <UploadCloud className="h-4 w-4 text-amber-600 dark:text-amber-300" />
                      </div>
                      <div>
                        <p className="font-medium">You already have an active S3 connection.</p>
                        <p className="text-sm text-amber-700 dark:text-amber-400">
                          Adding a new one will replace your existing connection due to system limitations.
                        </p>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
                
                <Alert className="mb-4">
                  <AlertDescription>
                    Your AWS credentials are securely stored and used only to access your bucket.
                  </AlertDescription>
                </Alert>
                
                <form onSubmit={handleAddS3} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    {/* AWS Credentials Section */}
                    <div className="border p-4 rounded-md">
                      <h3 className="text-md font-medium mb-3">AWS Credentials</h3>
                      
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="accessKeyId">Access Key ID</Label>
                          <Input
                            id="accessKeyId"
                            value={s3Form.accessKeyId}
                            onChange={(e) => setS3Form({ ...s3Form, accessKeyId: e.target.value })}
                            placeholder="AKIAXXXXXXXXXXXXXXXX"
                            required
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="secretAccessKey">Secret Access Key</Label>
                          <Input
                            id="secretAccessKey"
                            type="password"
                            value={s3Form.secretAccessKey}
                            onChange={(e) => setS3Form({ ...s3Form, secretAccessKey: e.target.value })}
                            placeholder="Your AWS secret access key"
                            required
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            We recommend creating IAM credentials with limited access to only this bucket.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Bucket Information */}
                    <div className="border p-4 rounded-md">
                      <h3 className="text-md font-medium mb-3">Bucket Information</h3>
                      
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="bucketName">Bucket Name</Label>
                          <Input
                            id="bucketName"
                            value={s3Form.bucketName}
                            onChange={(e) => setS3Form({ ...s3Form, bucketName: e.target.value })}
                            placeholder="my-bucket"
                            required
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="region">Region</Label>
                          <Input
                            id="region"
                            value={s3Form.region}
                            onChange={(e) => setS3Form({ ...s3Form, region: e.target.value })}
                            placeholder="us-east-1"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Leave default if unsure. This should match your bucket's region.
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="folderPrefix">Folder Prefix (Optional)</Label>
                          <Input
                            id="folderPrefix"
                            value={s3Form.folderPrefix}
                            onChange={(e) => setS3Form({ ...s3Form, folderPrefix: e.target.value })}
                            placeholder="uploads/user-files"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Specify a folder path if you want files organized in a specific directory.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isAddingS3}
                  >
                    {isAddingS3 ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Connect S3 Bucket
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="googleDrive">
            <Card>
              <CardHeader>
                <CardTitle>Connect Google Drive</CardTitle>
                <CardDescription>
                  Connect your Google Drive account for file storage.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {showGDriveAlert && googleDriveConnections.length > 0 && (
                  <Alert className="mb-4 border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-900">
                    <AlertDescription className="flex items-center">
                      <div className="shrink-0 mr-2 p-1 rounded-full bg-amber-100 dark:bg-amber-900">
                        <CloudUpload className="h-4 w-4 text-amber-600 dark:text-amber-300" />
                      </div>
                      <div>
                        <p className="font-medium">You already have an active Google Drive connection.</p>
                        <p className="text-sm text-amber-700 dark:text-amber-400">
                          Adding a new one will replace your existing connection due to system limitations.
                        </p>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="text-center py-6">
                  <CloudUpload className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">One-Click Authentication</h3>
                  <p className="text-sm text-gray-500 mb-6">
                    Click the button below to securely connect your Google Drive account.
                    You'll be redirected to Google to authorize access.
                  </p>
                  
                  <Button 
                    onClick={handleConnectGoogleDrive}
                    disabled={isConnectingGoogleDrive}
                    size="lg"
                    className="w-full md:w-auto"
                  >
                    {isConnectingGoogleDrive ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Connecting...
                      </>
                    ) : (
                      <>
                        <CloudUpload className="mr-2 h-4 w-4" />
                        Connect Google Drive
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Storage Connection</AlertDialogTitle>
            <AlertDialogDescription>
              {connectionToDelete?.storageType === 's3' ? (
                <>
                  Are you sure you want to delete the connection to S3 bucket <span className="font-medium">{connectionToDelete?.s3Config?.bucketName}</span>?
                </>
              ) : (
                <>
                  Are you sure you want to delete the connection to Google Drive account <span className="font-medium">{connectionToDelete?.googleDriveConfig?.email}</span>?
                </>
              )}
              <p className="mt-2">
                This action cannot be undone and will remove all access to files stored using this connection.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => connectionToDelete && handleDeleteConnection(connectionToDelete._id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}