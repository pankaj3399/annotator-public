"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Check, ChevronsUpDown, X, Mail } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getAllAnnotators } from '@/app/actions/annotator';
import { inviteMultipleAnnotatorsAction } from '@/app/actions/training';

// Define the structure of the user object returned WITHIN the JSON string
interface AnnotatorUser {
    _id: string;
    name?: string;
    email?: string;
    role: string;
    team_id: string;
}

// Type for the dropdown options
interface AnnotatorOption { 
    value: string; 
    label: string;
    email: string; 
}

interface InviteAnnotatorFormProps { 
    trainingId: string;
    webinarId?: string;
    webinarTitle?: string;
    webinarDescription?: string;
    scheduledAt?: string;
    projectManagerName?: string;
    onInviteSuccess?: () => void; // Optional callback for when invite succeeds
}

export function InviteAnnotatorForm({ 
    trainingId, 
    webinarId, 
    webinarTitle,
    webinarDescription,
    scheduledAt,
    projectManagerName,
    onInviteSuccess
}: InviteAnnotatorFormProps) {
    const [annotators, setAnnotators] = useState<AnnotatorOption[]>([]);
    const [selectedAnnotators, setSelectedAnnotators] = useState<AnnotatorOption[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingList, setIsLoadingList] = useState(true);
    const [popoverOpen, setPopoverOpen] = useState(false);
    const [customMessage, setCustomMessage] = useState('');
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
                        label: a.name || a.email || 'Unknown user',
                        email: a.email || ''
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

    const toggleAnnotator = (annotator: AnnotatorOption) => {
        // Check if annotator is already selected
        const isSelected = selectedAnnotators.some(a => a.value === annotator.value);
        
        if (isSelected) {
            // Remove from selection
            setSelectedAnnotators(prev => prev.filter(a => a.value !== annotator.value));
        } else {
            // Add to selection
            setSelectedAnnotators(prev => [...prev, annotator]);
        }
    };

    const removeAnnotator = (annotatorId: string) => {
        setSelectedAnnotators(prev => prev.filter(a => a.value !== annotatorId));
    };

    async function handleInvite() {
        if (selectedAnnotators.length === 0) {
            toast({ variant: "destructive", title: "Selection Required", description: "Please select at least one annotator." });
            return;
        }
        
        setIsLoading(true);
        try {
            // Collect annotator IDs and emails
            const annotatorIds = selectedAnnotators.map(a => a.value);
            const emails = selectedAnnotators.map(a => a.email).filter(Boolean);

            // Call the server action
            const result = await inviteMultipleAnnotatorsAction({
                trainingId,
                webinarId: webinarId || "",
                annotatorIds,
                emails,
                customMessage,
                webinarDetails: {
                    title: webinarTitle || "Training Webinar",
                    description: webinarDescription || "",
                    scheduledAt: scheduledAt || "",
                    invitedBy: projectManagerName || "Project Manager"
                }
            });

            if (result.success) {
                toast({ 
                    title: "Success", 
                    description: `Invited ${selectedAnnotators.length} annotator${selectedAnnotators.length > 1 ? 's' : ''} successfully.` 
                });
                // Reset form
                setSelectedAnnotators([]);
                setCustomMessage('');
                
                // Call the success callback if provided
                if (onInviteSuccess) {
                    onInviteSuccess();
                }
            } else {
                toast({ 
                    variant: "destructive", 
                    title: "Error", 
                    description: result.message || "Failed to invite annotators." 
                });
            }
        } catch (error: any) {
            console.error("Invite action error:", error);
            toast({ 
                variant: "destructive", 
                title: "Error", 
                description: error.message || "Failed to send invitation." 
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="space-y-4">            
            <div>
                <Label htmlFor="annotator-select">Select Annotators</Label>
                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={popoverOpen}
                            className="w-full justify-between"
                            disabled={isLoadingList || isLoading}
                            id="annotator-select"
                        >
                            {isLoadingList ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...</>
                            ) : selectedAnnotators.length > 0 ? (
                                `${selectedAnnotators.length} annotator${selectedAnnotators.length > 1 ? 's' : ''} selected`
                            ) : (
                                "Select annotators..."
                            )}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                            <CommandInput placeholder="Search by name or email..." />
                            <CommandList>
                                <CommandEmpty>No annotator found in your team.</CommandEmpty>
                                <ScrollArea className="h-[200px]">
                                    <CommandGroup>
                                        {annotators.map((annotator) => (
                                            <CommandItem
                                                key={annotator.value}
                                                value={`${annotator.label} ${annotator.email}`}
                                                onSelect={() => {
                                                    toggleAnnotator(annotator);
                                                    // Keep popover open to allow multiple selections
                                                }}
                                            >
                                                <Check 
                                                    className={cn(
                                                        "mr-2 h-4 w-4", 
                                                        selectedAnnotators.some(a => a.value === annotator.value) 
                                                            ? "opacity-100" 
                                                            : "opacity-0"
                                                    )} 
                                                />
                                                <div className="flex flex-col">
                                                    <span>{annotator.label}</span>
                                                    {annotator.email && (
                                                        <span className="text-xs text-muted-foreground">{annotator.email}</span>
                                                    )}
                                                </div>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </ScrollArea>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>

            {selectedAnnotators.length > 0 && (
                <div className="mt-2">
                    <Label className="text-sm mb-2 block">Selected Annotators</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                        {selectedAnnotators.map((annotator) => (
                            <Badge key={annotator.value} variant="secondary" className="flex items-center gap-1">
                                {annotator.label}
                                <button 
                                    type="button" 
                                    onClick={() => removeAnnotator(annotator.value)}
                                    className="ml-1 hover:bg-muted rounded-full p-0.5"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        ))}
                    </div>
                </div>
            )}

            <div>
                <Label htmlFor="custom-message">Additional Message (Optional)</Label>
                <Textarea
                    id="custom-message"
                    placeholder="Add a personal message to the invitation email..."
                    className="min-h-[80px]"
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                    This message will be included in the invitation email.
                </p>
            </div>

            <Button 
                onClick={handleInvite} 
                disabled={selectedAnnotators.length === 0 || isLoading || isLoadingList} 
                className="w-full"
            >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Mail className="mr-2 h-4 w-4" />
                Invite {selectedAnnotators.length > 0 ? selectedAnnotators.length : ''} Annotator{selectedAnnotators.length !== 1 ? 's' : ''}
            </Button>
        </div>
    );
}