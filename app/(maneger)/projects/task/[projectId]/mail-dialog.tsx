import { Dialog, DialogContent, DialogHeader, DialogDescription, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import MemberCombobox from "@/app/(maneger)/chat/_components/MemberCombobox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Mail } from "lucide-react";

// TypeScript interface for props
interface MailDialogComponentProps {
  isMailDialogOpen: boolean;
  setIsMailDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  selectedMembers: { _id: string; name: string;email:string;lastLogin:string;  isReadyToWork?:boolean
    permission?: string[];
    role:string | null;  }[];
  setSelectedMembers: React.Dispatch<React.SetStateAction<{ _id: string; name: string;email:string;lastLogin:string;  isReadyToWork?:boolean
    permission?: string[];
    role:string | null; }[]>>;
  handleSendEmail: (members: { _id: string; name: string;email:string;lastLogin:string;  isReadyToWork?:boolean
    permission?: string[];
    role:string | null; }[]) => void;
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
  return (
    <Dialog open={isMailDialogOpen} onOpenChange={setIsMailDialogOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Select Annotators</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Choose the annotators you want to send emails to. <br /> (Email will be the same as you configured in the custom template)
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* MultiSelect Component */}
          <MemberCombobox 
            selectedMembers={selectedMembers} 
            setSelectedMembers={setSelectedMembers} 
          />

          {/* Selected Annotators as Badges */}
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
          {/* Cancel Button */}
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => {
              setSelectedMembers([]); // Reset to an empty array
              setIsMailDialogOpen(false);
            }}
          >
            Cancel
          </Button>

          {/* Send Mail Button */}
          <Button
            className="w-full sm:w-auto"
            onClick={() => handleSendEmail(selectedMembers)}
            disabled={selectedMembers.length === 0 || isLoading} // Disable when loading or no members selected
          >
            {isLoading ? (
              <span className="mr-2 h-4 w-4" style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>
                <Loader2 className="h-4 w-4" />
              </span>
            ) : (
              <Mail className="mr-2 h-4 w-4" />
            )}
            Send Mail ({selectedMembers.length}) {/* Use length of array */}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
