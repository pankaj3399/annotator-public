// src/components/training/TrainingWebinarList.tsx
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Video, Radio, CheckCircle, XCircle, Clock, Info } from 'lucide-react';
import ReactPlayer from 'react-player/lazy';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';

// --- Define Consistent Serialized Types ---
// Use the same enum type as defined in the parent page component
type WebinarStatus = "scheduled" | "live" | "completed" | "cancelled";

// Define the interface for props matching the serialized data from the parent
interface SerializedWebinarSession {
    _id: string;
    title: string;
    description?: string;
    roomId: string | null;
    scheduledAt: string | null; // Date as string
    duration?: number;
    status: WebinarStatus; // Use the specific enum type
    recordedVideo: {
        url: string | null;
        uploadedAt: string | null;
        duration: number | null;
    };
    instructor: string; // Instructor ID as string
    // Add other fields like participants if needed
}

interface TrainingWebinarListProps {
    // *** Expect array of the CORRECT serialized type ***
    webinars: SerializedWebinarSession[];
}
// --- End Type Definitions ---

export function TrainingWebinarList({ webinars }: TrainingWebinarListProps) {
    const { data: session } = useSession();
    const userRole = (session?.user as { role?: string })?.role;

    // Functions use the correct type
    const canJoinWebinar = (webinar: SerializedWebinarSession): boolean => {
        return (webinar.status === 'live' || webinar.status === 'scheduled') &&
               (userRole === 'project manager' || userRole === 'annotator');
    };

    const canViewRecording = (webinar: SerializedWebinarSession): boolean => {
        return webinar.status === 'completed' && !!webinar.recordedVideo?.url;
    };

    const getStatusBadge = (status: SerializedWebinarSession['status']) => {
         switch (status) {
            case 'live': return <Badge variant="destructive"><Radio className="mr-1 h-3 w-3" /> Live</Badge>;
            case 'completed': return <Badge variant="secondary"><CheckCircle className="mr-1 h-3 w-3" /> Completed</Badge>;
            case 'scheduled': return <Badge variant="outline"><Clock className="mr-1 h-3 w-3" /> Scheduled</Badge>;
            case 'cancelled': return <Badge variant="outline" className="text-muted-foreground"><XCircle className="mr-1 h-3 w-3" /> Cancelled</Badge>;
            default: return <Badge variant="outline">{status}</Badge>; // Fallback for safety
        }
    };

    return (
        <div className="space-y-4">
            {/* Map over the correctly typed webinars array */}
            {webinars.map((webinar) => (
                // Key is string webinar._id
                <Card key={webinar._id}>
                    <CardHeader className="pb-4">
                        <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-lg">{webinar.title}</CardTitle>
                            {getStatusBadge(webinar.status)}
                        </div>
                        {webinar.scheduledAt && (
                            <CardDescription className="text-xs text-muted-foreground">
                                {/* Parse string date before formatting */}
                                Scheduled: {format(new Date(webinar.scheduledAt), "PPp")}
                                {webinar.duration && ` (~${webinar.duration} mins)`}
                            </CardDescription>
                        )}
                    </CardHeader>
                    {webinar.description && (
                       <CardContent className="pb-4 pt-0">
                           <p className="text-sm text-muted-foreground">{webinar.description}</p>
                       </CardContent>
                    )}
                    <CardFooter className="flex flex-wrap items-center gap-2 pt-0">
                        {canJoinWebinar(webinar) && (
                            <Button asChild size="sm">
                                {/* Link uses webinar._id (string) */}
                                <Link href={`/training/${webinar._id}`}>
                                    <Radio className="mr-2 h-4 w-4" /> Join Session
                                </Link>
                            </Button>
                        )}
                        {canViewRecording(webinar) && (
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        <Video className="mr-2 h-4 w-4" /> View Recording
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl p-0 sm:p-0">
                                    <div className="aspect-video overflow-hidden rounded-lg bg-black">
                                        {typeof window !== 'undefined' && webinar.recordedVideo?.url && (
                                            <ReactPlayer
                                                url={webinar.recordedVideo.url}
                                                controls playing width="100%" height="100%"
                                                onError={(e) => console.error('ReactPlayer Error:', e)}
                                            />
                                        )}
                                    </div>
                                </DialogContent>
                            </Dialog>
                        )}
                         {!canJoinWebinar(webinar) && !canViewRecording(webinar) && webinar.status !== 'cancelled' && (
                            <span className="text-xs text-muted-foreground italic">
                                {webinar.status === 'completed' ? 'Recording not yet available.' : `Session is ${webinar.status}.`}
                            </span>
                        )}
                         {webinar.status === 'cancelled' && (
                             <span className="text-xs text-muted-foreground italic">Session Cancelled</span>
                         )}
                    </CardFooter>
                </Card>
            ))}
        </div>
    );
}