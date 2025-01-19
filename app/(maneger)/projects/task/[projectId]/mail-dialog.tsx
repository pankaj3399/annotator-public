import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogDescription, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import MemberCombobox from "@/app/(maneger)/chat/_components/MemberCombobox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Loader2 } from "lucide-react";
import EmailConfirmationDialog from './email';

interface MailDialogComponentProps {
  isMailDialogOpen: boolean;
  setIsMailDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  selectedMembers: {
    _id: string;
    name: string;
    email: string;
    lastLogin: string;
    isReadyToWork?: boolean;
    permission?: string[];
    role: string | null;
  }[];
  setSelectedMembers: React.Dispatch<React.SetStateAction<{
    _id: string;
    name: string;
    email: string;
    lastLogin: string;
    isReadyToWork?: boolean;
    permission?: string[];
    role: string | null;
  }[]>>;
  handleSendEmail: (members: {
    _id: string;
    name: string;
    email: string;
    lastLogin: string;
    isReadyToWork?: boolean;
    permission?: string[];
    role: string | null;
  }[]) => void;
  isLoading: boolean;
}

export function MailDialogComponent({
  isMailDialogOpen,
  setIsMailDialogOpen,
  selectedMembers,
  setSelectedMembers,
  handleSendEmail,
  isLoading
}: MailDialogComponentProps) {
  // State for confirmation dialog with rich text editor
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

  // Handler for the initial send button
  const handleInitialSend = () => {
    setIsConfirmDialogOpen(true);
  };

  // Handler for confirming email send with email data
  const handleConfirmSend = () => {
    handleSendEmail(selectedMembers);
    setIsConfirmDialogOpen(false);
    setIsMailDialogOpen(false); // Close the main dialog as well
  };

  // Handler for closing both dialogs
  const handleCancel = () => {
    setSelectedMembers([]);
    setIsMailDialogOpen(false);
    setIsConfirmDialogOpen(false);
  };

  return (
    <>
      {/* Main Selection Dialog */}
      <Dialog open={isMailDialogOpen} onOpenChange={setIsMailDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Select Annotators</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Choose the annotators you want to send emails to.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <MemberCombobox 
              selectedMembers={selectedMembers} 
              setSelectedMembers={setSelectedMembers} 
            />

            <div className="flex flex-wrap gap-2">
              {selectedMembers.length > 0 ? (
                selectedMembers.map((member) => (
                  <Badge key={member._id} className="bg-blue-500 text-white">
                    {member.name}
                  </Badge>
                ))
              ) : (
                <p>No annotators selected.</p>
              )}
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row justify-between gap-4 sm:gap-2">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={handleCancel}
            >
              Cancel
            </Button>

            <Button
              className="w-full sm:w-auto"
              onClick={handleInitialSend}
              disabled={selectedMembers.length === 0 || isLoading}
            >
              <Mail className="mr-2 h-4 w-4" />
              Continue ({selectedMembers.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Confirmation Dialog with Rich Text Editor */}
      <EmailConfirmationDialog
        isOpen={isConfirmDialogOpen}
        onClose={() => setIsConfirmDialogOpen(false)}
        onSend={handleConfirmSend}
        selectedMemberCount={selectedMembers.length}
        isLoading={isLoading}
      />
    </>
  );
}

export default MailDialogComponent;