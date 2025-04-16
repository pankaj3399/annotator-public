"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { InviteAnnotatorForm } from './InviteAnnotatorForm';

interface InviteModalProps {
    isOpen: boolean;
    onClose: () => void;
    trainingId: string;
    webinarId: string;
    webinarTitle: string;
    webinarDescription?: string;
    scheduledAt?: string | null;
    projectManagerName: string;
}

export function InviteModal({
    isOpen,
    onClose,
    trainingId,
    webinarId,
    webinarTitle,
    webinarDescription,
    scheduledAt,
    projectManagerName
}: InviteModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Invite Annotators to Webinar</DialogTitle>
                    <DialogDescription>
                        Send invitations for "{webinarTitle}" to multiple annotators
                    </DialogDescription>
                </DialogHeader>
                
                <InviteAnnotatorForm
                    trainingId={trainingId}
                    webinarId={webinarId}
                    webinarTitle={webinarTitle}
                    webinarDescription={webinarDescription || ""}
                    scheduledAt={scheduledAt || ""}
                    projectManagerName={projectManagerName}
                    onInviteSuccess={onClose}
                />
            </DialogContent>
        </Dialog>
    );
}