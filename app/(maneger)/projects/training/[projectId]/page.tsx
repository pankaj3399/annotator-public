// src/app/(maneger)/projects/training/[projectId]/page.tsx
import { getServerSession } from 'next-auth';
import { connectToDatabase } from '@/lib/db';
import { Training, ITraining } from '@/models/Training'; // Assuming ITraining uses IWebinarSession
import { Project } from '@/models/Project'; // Adjust if your Project model name/path is different
import { notFound, redirect } from 'next/navigation';
import mongoose, { Types } from 'mongoose';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Terminal, Info } from "lucide-react";
import { Suspense } from 'react';
import { authOptions } from '@/auth'; // Adjust path
import { CreateWebinarForm } from '@/components/training/CreateWebinarForm'; // Adjust path
import { TrainingWebinarList } from '@/components/training/TrainingWebinarList'; // Adjust path
import Loader from '@/components/ui/NewLoader/Loader';
import { isAnnotator } from '@/lib/userRoles';

interface ProjectTrainingPageProps {
    params: { projectId: string };
}

// --- Define Consistent Serialized Types ---
type WebinarStatus = "scheduled" | "live" | "completed" | "cancelled";
interface SerializedWebinar {
    _id: string; title: string; description?: string; roomId: string | null;
    scheduledAt: string | null; duration?: number; status: WebinarStatus;
    recordedVideo: { url: string | null; uploadedAt: string | null; duration: number | null; };
    participants: { user: string; joinedAt: string | null; leftAt: string | null; }[];
    instructor: string; created_at: string; updated_at: string;
}
interface SerializedTraining {
    _id: string; title: string; description?: string; project: string;
    webinars: SerializedWebinar[]; isActive: boolean;
    invitedAnnotators?: string[]; // Make optional as it might not exist on old data
    created_at: string; updated_at: string;
}
// --- End Serialized Types ---

// --- Helper to fetch Training Data and Serialize ---
async function getTrainingDataForProject(projectId: string): Promise<SerializedTraining | null> {
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
        return null;
    }
    try {
        await connectToDatabase();
        const training = await Training.findOne({ project: new Types.ObjectId(projectId) })
                                         .sort({ 'webinars.scheduledAt': -1 })
                                         .lean({ virtuals: true }); // Use lean for performance and easier serialization

        if (!training) {
            return null;
        }

        // Manual serialization to ensure dates/ObjectIds are strings
        // Note: lean() often helps, but explicit stringify/parse is safest for complex nested objects/dates
        const serialized = JSON.parse(JSON.stringify(training));

        return serialized as SerializedTraining;
    } catch (error) {
        console.error(`[getTrainingDataForProject] >> Error fetching/serializing training data for project ${projectId}:`, error);
        return null;
    }
}

// --- Helper to check Project Ownership (Accepts string userId) ---
async function isProjectManagerOfProject(userId: string, projectId: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(projectId) || !mongoose.Types.ObjectId.isValid(userId)) {
        return false;
    }
    try {
        await connectToDatabase();
        const project = await Project.findOne({
            _id: new Types.ObjectId(projectId),
            project_Manager: new Types.ObjectId(userId) // Use the correct field name
        }).lean(); // Use lean for performance if just checking existence

        const isOwner = !!project;
        return isOwner;
    } catch (error) {
        console.error("[isProjectManagerOfProject] >> Error checking project ownership:", error);
        return false;
    }
}

export default async function ProjectTrainingPage({ params }: ProjectTrainingPageProps) {

    const session = await getServerSession(authOptions);

    // Extract user info safely
    const user = session?.user as { id?: string; role?: string } | undefined;

    if (!user?.id || !user?.role) {
        redirect('/auth/login');
        // Note: redirect() throws an error, so execution stops here.
    }
   
    const trainingData = await getTrainingDataForProject(params.projectId);

    // Check project manager status ONLY if the user's role is 'project manager'
    let isProjectManager = false;
    if (user.role === 'project manager') {
        isProjectManager = await isProjectManagerOfProject(user.id, params.projectId);
    } else {
    }

    // Check if the user is an invited annotator ONLY if the user's role is 'annotator'
    // Added optional chaining for invitedAnnotators as it might not exist
    const isInvitedAnnotator = isAnnotator(user.role) &&
                                !!trainingData?.invitedAnnotators?.includes(user.id);

    // --- Authorization Check ---
    // Scenario 1: User is NOT PM and NOT invited, AND training data EXISTS
    if (!isProjectManager && !isInvitedAnnotator && trainingData) {
        return ( // *** RETURN an Alert component ***
             <div className="container mx-auto p-6">
                  <Alert variant="destructive">
                     <Terminal className="h-4 w-4" />
                     <AlertTitle>Access Denied</AlertTitle>
                     <AlertDescription>You do not have permission for this training section.</AlertDescription>
                  </Alert>
             </div>
        );
    }
    // Scenario 2: User is NOT PM and training data DOES NOT EXIST
     if (!isProjectManager && !trainingData) {
        // Note: An invited annotator should only see this page if trainingData *exists*.
        // So, if trainingData is null, only the PM should see anything other than "Not Found".
        return ( // *** RETURN an Alert component ***
              <div className="container mx-auto p-6">
                   <Alert variant="destructive">
                      <Terminal className="h-4 w-4" />
                      <AlertTitle>Not Found</AlertTitle>
                      <AlertDescription>Training information is not available for this project.</AlertDescription>
                   </Alert>
              </div>
         );
     }
    // --- End Authorization ---


    // If execution reaches here, the user is either the PM or an invited Annotator (or PM viewing a non-existent training)
    const trainingIdString = trainingData?._id; // Get ID as string for props
    
    if (!trainingData && isProjectManager) {
    }
    if (isProjectManager) {
      
        if (trainingIdString) {
        } else {
        }
    }
    if (trainingData?.webinars && trainingData.webinars.length > 0) {
    } else {
        if (trainingData) {
        } else if (isProjectManager) {
        } else {
            // This case should technically not be reachable if !isProjectManager && !trainingData was caught above,
            // but adding for completeness.
        }
    }

    return (
        // Main page content container
        <div className="container mx-auto max-w-5xl space-y-8 p-4 md:p-6 lg:p-8">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Project Training</h1>
                {trainingData?.title && (<p className="mt-1 text-lg text-muted-foreground">{trainingData.title}</p>)}
                {trainingData?.description && (<p className="mt-2 text-sm text-muted-foreground">{trainingData.description}</p>)}
                 {/* Message for PM when training doesn't exist yet */}
                 {!trainingData && isProjectManager && (
                     <p className="mt-2 text-sm text-muted-foreground">No training details found. Create the first webinar below to start.</p>
                 )}
            </div>

            {/* Project Manager Controls Section */}
            {isProjectManager && (
                <Card>
                    <CardHeader><CardTitle>Manager Controls</CardTitle></CardHeader>
                    <CardContent className="space-y-6">
                        <CreateWebinarForm
                             trainingId={trainingIdString} // Pass null/undefined if training doesn't exist yet
                             projectId={params.projectId}
                             instructorId={user.id!} // User ID is guaranteed non-null here
                        />
                        <Separator />
                       
                    </CardContent>
                </Card>
            )}

            {/* Webinar List Section */}
            <div className="mt-8">
                 <h2 className="mb-4 text-2xl font-semibold tracking-tight">Webinar Sessions</h2>
                {trainingData?.webinars && trainingData.webinars.length > 0 ? (
                     <Suspense fallback={<div className="text-center p-4"><Loader/></div>}>
                        <TrainingWebinarList webinars={trainingData.webinars}  trainingId={trainingData._id} />
                     </Suspense>
                ) : (
                    // Show appropriate message if no webinars exist
                    <div className="flex items-center justify-center rounded-md border border-dashed p-8 text-center text-muted-foreground">
                        <Info className="mr-2 h-5 w-5" />
                        {/* Slightly different message depending on whether training exists */}
                        {trainingData ? "No webinars created yet for this training." : (isProjectManager ? "Create a webinar above to get started." : "No webinar sessions are currently scheduled.")}
                    </div>
                )}
            </div>
            {/* Log end before returning the final JSX */}
        </div>
    );

}