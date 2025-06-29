"use client";

import { useState, useEffect } from 'react';
import { HMSPrebuilt } from '@100mslive/roomkit-react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from "next-auth/react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import { AlertCircle, Camera, Mic } from "lucide-react"; // Added Camera and Mic icons
import Loader from '@/components/ui/NewLoader/Loader';
import { isAnnotator, isProjectManager } from '@/lib/userRoles';

export default function WebinarPage() {
    const params = useParams();
    const router = useRouter();
    // Ensure sessionId is treated as string, handle potential array/undefined
    const sessionId = Array.isArray(params.sessionId) ? params.sessionId[0] : params.sessionId;

    const [authToken, setAuthToken] = useState<string | null>(null);
    const [isLoadingToken, setIsLoadingToken] = useState(true); // Start true
    const [error, setError] = useState<string | null>(null);
    
    // New state for media permissions
    const [hasMediaPermissions, setHasMediaPermissions] = useState<boolean>(false);
    const [isRequestingPermissions, setIsRequestingPermissions] = useState<boolean>(false);
    const [permissionsError, setPermissionsError] = useState<string | null>(null);

    const { data: session, status: authStatus } = useSession();
    
    // Function to request media permissions
    const requestMediaPermissions = async () => {
        setIsRequestingPermissions(true);
        setPermissionsError(null);
        try {
            // Request both camera and microphone permissions
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });
            
            // If successful, set permissions granted
            setHasMediaPermissions(true);
            
            // Clean up the stream (we don't need it running, just need the permissions)
            stream.getTracks().forEach(track => track.stop());
            
        } catch (err: any) {
            console.error('Permission error:', err);
            setPermissionsError(err.message || 'Failed to access camera and microphone. Please grant permissions.');
            setHasMediaPermissions(false);
        } finally {
            setIsRequestingPermissions(false);
        }
    };

    useEffect(() => {
        // Ensure sessionId is valid before proceeding
        if (!sessionId) {
            setError("Invalid webinar session identifier.");
            setIsLoadingToken(false);
            return;
        }
    
        if (authStatus === 'loading') return; // Wait for auth check
    
        if (authStatus === 'unauthenticated') {
            setError("Authentication required. Please log in.");
            setIsLoadingToken(false);
            return;
        }
    
        if (authStatus === 'authenticated' && session?.user) {
            const user = session.user as { id: string; role: string; }; // Adjust type as needed
            const requiredRole = isProjectManager(user.role) || isAnnotator(user.role);
    
            if (!requiredRole) {
                setError(`Access Denied: Role (${user.role}) not permitted.`);
                setIsLoadingToken(false);
                return;
            }
    
            setIsLoadingToken(true); // Start loading token
            setError(null);
    
            // Fetch with timeout implementation
            const fetchWithTimeout = (url: string, options: RequestInit, timeout: number = 30000) => {
                return Promise.race([
                    fetch(url, options),
                    new Promise<Response>((_, reject) => 
                        setTimeout(() => reject(new Error(`Request timed out after ${timeout}ms`)), timeout)
                    )
                ]);
            };
    
            // Use the timeout-enabled fetch
            fetchWithTimeout('/api/hms/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, userRole: user.role, webinarSessionId: sessionId }),
            }, 60000) // 60 second timeout
            .then(async (res) => {
                // First check if the response can be parsed as JSON
                const contentType = res.headers.get("content-type");
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || `Failed to get join token (${res.status})`);
                    if (!data.authToken) throw new Error("Invalid token received from server.");
                    setAuthToken(data.authToken);
                } else {
                    // Handle non-JSON responses (like HTML error pages)
                    const text = await res.text();
                    console.error("Non-JSON response:", text);
                    throw new Error(`Server returned non-JSON response (${res.status})`);
                }
            })
            .catch((err: any) => {
                console.error("Token fetch error:", err);
                setError(err.message || "Error preparing webinar room.");
            })
            .finally(() => setIsLoadingToken(false)); // Finish loading attempt
        }
    
    }, [sessionId, session, authStatus]);// Dependencies

    // --- Render logic ---
    if (authStatus === 'loading' || isLoadingToken) {
        return <Loader />;
    }

    if (error) { // Handles auth errors, permission errors, token fetch errors
        return (
            <div className="flex h-screen w-screen items-center justify-center p-4">
                <Alert variant="destructive" className="max-w-lg">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                    {authStatus === 'unauthenticated' && (
                         <Button onClick={() => router.push('/auth/login')} className="mt-4">Login</Button>
                    )}
                </Alert>
            </div>
        );
    }

    // Show permission request UI if authenticated with token but no media permissions yet
    if (authStatus === 'authenticated' && authToken && !hasMediaPermissions) {
        return (
            <div className="flex h-screen w-screen items-center justify-center p-4">
                <div className="max-w-lg p-6 border rounded-lg shadow-md bg-white">
                    <h2 className="text-xl font-semibold mb-4">Camera & Microphone Access Required</h2>
                    
                    <div className="flex items-center space-x-2 mb-6">
                        <Camera className="h-5 w-5 text-blue-500" />
                        <Mic className="h-5 w-5 text-blue-500" />
                        <p>This webinar requires access to your camera and microphone.</p>
                    </div>
                    
                    {permissionsError && (
                        <Alert variant="destructive" className="mb-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Permission Error</AlertTitle>
                            <AlertDescription>{permissionsError}</AlertDescription>
                        </Alert>
                    )}
                    
                    <div className="flex flex-col space-y-3">
                        <Button 
                            onClick={requestMediaPermissions}
                            disabled={isRequestingPermissions}
                            className="w-full"
                        >
                            {isRequestingPermissions ? 'Requesting Access...' : 'Grant Camera & Microphone Access'}
                        </Button>
                        
                        <div className="text-sm text-gray-500 mt-2">
                            <p>If you previously denied permissions, you may need to reset them in your browser settings.</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Only render HMS component if authenticated, has token, and media permissions granted
    if (authStatus === 'authenticated' && authToken && hasMediaPermissions) {
        return (
            <div style={{ height: '100vh', width: '100vw' }}>
                <HMSPrebuilt authToken={authToken} />
            </div>
        );
    }

    // Fallback (shouldn't usually be reached)
    return (
        <div className="flex h-screen w-screen items-center justify-center p-4">
            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Status</AlertTitle>
                <AlertDescription>Initializing...</AlertDescription>
            </Alert>
        </div>
    );
}