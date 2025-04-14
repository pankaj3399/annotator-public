// src/components/training/InviteAnnotatorForm.tsx
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Check, ChevronsUpDown } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { getAllAnnotators } from '@/app/actions/annotator';
import { inviteAnnotatorAction } from '@/app/actions/training';

// Define the structure of the user object returned WITHIN the JSON string
// (excluding password as per the select statement in the action)
interface AnnotatorUser {
    _id: string; // Assuming it gets serialized to string
    name?: string;
    email?: string;
    role: string;
    team_id: string; // Or ObjectId if not serialized properly
    // Add other fields returned by your User model if necessary
}

// Type for the dropdown options
interface AnnotatorOption { value: string; label: string; }

interface InviteAnnotatorFormProps { trainingId: string; }

export function InviteAnnotatorForm({ trainingId }: InviteAnnotatorFormProps) {
    const [annotators, setAnnotators] = useState<AnnotatorOption[]>([]);
    const [selectedAnnotatorId, setSelectedAnnotatorId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingList, setIsLoadingList] = useState(true);
    const [popoverOpen, setPopoverOpen] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        setIsLoadingList(true);
        // Call the server action
        getAllAnnotators()
            .then((jsonDataString) => {
                try {
                    // *** PARSE THE JSON STRING ***
                    const parsedData: AnnotatorUser[] = JSON.parse(jsonDataString);

                    if (!Array.isArray(parsedData)) {
                        throw new Error("Parsed data is not an array");
                    }

                    // Map the parsed array to dropdown options
                    setAnnotators(parsedData.map((a: AnnotatorUser) => ({
                        value: a._id.toString(), // Ensure ID is string
                        label: `${a.name || 'N/A'} (${a.email || 'N/A'})`
                    })));

                } catch (parseError) {
                    console.error("Failed to parse annotator data:", parseError);
                    toast({ variant: "destructive", title: "Error", description: "Could not process annotator list." });
                    setAnnotators([]); // Set to empty array on parsing error
                }
            })
            .catch(err => {
                console.error("Failed to fetch annotators:", err);
                toast({ variant: "destructive", title: "Error", description: "Could not load annotator list." });
                 setAnnotators([]); // Set to empty array on fetch error
            })
            .finally(() => setIsLoadingList(false));
    }, [toast]); // Dependency array

    async function handleInvite() {
        if (!selectedAnnotatorId) {
            toast({ variant: "destructive", title: "Selection Required", description: "Please select an annotator." });
            return;
        }
        setIsLoading(true);
        try {
             // Ensure inviteAnnotatorAction path is correct
             const result = await inviteAnnotatorAction(trainingId, selectedAnnotatorId);
             toast({ title: result.success ? "Success" : "Info", description: result.message });
             if (result.success) setSelectedAnnotatorId(null); // Clear selection on success
        } catch (error) {
             console.error("Invite action error:", error);
             toast({ variant: "destructive", title: "Error", description: "Failed to send invitation." });
        } finally {
             setIsLoading(false);
        }
    }

    // --- JSX Remains the same ---
    return (
        <div className="space-y-3 rounded-md border p-4">
             <h3 className="text-lg font-medium">Invite Annotator to Training</h3>
             <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:space-x-2">
                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={popoverOpen}
                            className="w-full justify-between sm:w-[300px]"
                            disabled={isLoadingList || isLoading}
                        >
                            {isLoadingList ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...</>) :
                                selectedAnnotatorId ? (annotators.find(a => a.value === selectedAnnotatorId)?.label) : ("Select team annotator...")}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                            <CommandInput placeholder="Search by name or email..." />
                            <CommandList>
                                <CommandEmpty>No annotator found in your team.</CommandEmpty>
                                <CommandGroup>
                                    {annotators.map((annotator) => (
                                        <CommandItem
                                            key={annotator.value}
                                            value={annotator.label} // Search uses this value
                                            onSelect={() => {
                                                 setSelectedAnnotatorId(annotator.value);
                                                 setPopoverOpen(false);
                                            }}
                                        >
                                            <Check className={cn("mr-2 h-4 w-4", selectedAnnotatorId === annotator.value ? "opacity-100" : "opacity-0")} />
                                            {annotator.label}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>

                <Button onClick={handleInvite} disabled={!selectedAnnotatorId || isLoading || isLoadingList} className="w-full sm:w-auto">
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Invite to Training
                </Button>
            </div>
        </div>
    );
}