// src/components/training/CreateWebinarForm.tsx
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from 'lucide-react';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { createWebinarAction } from '@/app/actions/training';

// Input Schema Validation
const webinarSchema = z.object({
    title: z.string().min(3, { message: "Title must be at least 3 characters." }),
    description: z.string().max(500, { message: "Description too long (max 500)." }).optional(),
    // Example: Add more fields if needed
    // duration: z.coerce.number().positive("Duration must be positive.").optional(), // coerce converts string input
    // scheduledAt: z.string().optional(), // Use string for datetime-local input, parse in action
});

type WebinarFormData = z.infer<typeof webinarSchema>;

interface CreateWebinarFormProps {
    trainingId: string | undefined; // ID of the parent Training document (might be undefined)
    projectId: string; // Project ID is required
    instructorId: string;
}

export function CreateWebinarForm({ trainingId, projectId, instructorId }: CreateWebinarFormProps) {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const form = useForm<WebinarFormData>({
        resolver: zodResolver(webinarSchema),
        defaultValues: { title: "", description: "" },
    });

    async function onSubmit(data: WebinarFormData) {
         // Removed the !trainingId check if using Approach 2

         setIsLoading(true);
         console.log(`[CreateWebinarForm] Submitting with:`, { trainingId, projectId, instructorId, title: data.title }); // Log inputs
         try {
             // Pass both trainingId (which might be undefined) and projectId
             const result = await createWebinarAction({
                 trainingId: trainingId, // Pass undefined if no training exists yet
                 projectId: projectId,   // FIX: Pass the required projectId
                 title: data.title,
                 description: data.description,
                 instructorId: instructorId,
                 // duration: data.duration, // Pass other fields
                 // scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
             });

             console.log(`[CreateWebinarForm] Action result:`, result); // Log result

             if (result.success) {
                 toast({ title: "Success", description: result.message });
                 form.reset(); // Clear form
                 // Revalidation should happen via the server action now
             } else {
                 toast({ variant: "destructive", title: "Error", description: result.message || "Failed to create webinar." });
             }
         } catch (error) {
             console.error("[CreateWebinarForm] onSubmit error:", error); // Log the actual error object
             toast({ variant: "destructive", title: "Error", description: "An unexpected client-side error occurred." });
         } finally {
             setIsLoading(false);
         }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 rounded-md border p-4">
                 <h3 className="text-lg font-medium">Create New Webinar Session</h3>
                <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Webinar Title *</FormLabel>
                            <FormControl><Input placeholder="e.g., Introduction to Annotation" {...field} disabled={isLoading} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl><Textarea placeholder="Provide details about the webinar..." {...field} disabled={isLoading} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 {/* Add fields for duration, scheduledAt using appropriate Shadcn inputs */}

                <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {/* Decide if you want the check back or let the action handle it */}
                    {/* {trainingId ? "Create Webinar" : "Create First Webinar"} */}
                     Create Webinar
                </Button>
            </form>
        </Form>
    );
}