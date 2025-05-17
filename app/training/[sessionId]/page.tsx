// src/app/training/[sessionId]/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { HMSPrebuilt } from '@100mslive/roomkit-react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from "next-auth/react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import { AlertCircle } from "lucide-react"; // Use Lucide icons
import Loader from '@/components/ui/NewLoader/Loader';

export default function WebinarPage() {
    const params = useParams();
    const router = useRouter();
    // Ensure sessionId is treated as string, handle potential array/undefined
    const sessionId = Array.isArray(params.sessionId) ? params.sessionId[0] : params.sessionId;

    const [authToken, setAuthToken] = useState<string | null>(null);
    const [isLoadingToken, setIsLoadingToken] = useState(true); // Start true
    const [error, setError] = useState<string | null>(null);

    const { data: session, status: authStatus } = useSession();
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
            const requiredRole = user.role === 'project manager' || user.role === 'annotator';
    
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
        return (
                <Loader/>
           
        );
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

    if (authStatus === 'authenticated' && authToken) {
        return (
            <div style={{ height: '100vh', width: '100vw' }}>
                <HMSPrebuilt authToken={authToken}  />
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