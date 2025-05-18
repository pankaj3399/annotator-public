import { useEffect, useState } from 'react';
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { Dialog, DialogContent, DialogHeader, DialogDescription, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Mail } from "lucide-react";
import { getCustomNotificationTemplatesByProject } from '@/app/actions/task';
import { usePathname } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";

interface EmailConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: ()=>void;
  selectedMemberCount: number;
  isLoading: boolean;
}


interface Template{
  _id:string;
  active:boolean;
  createdAt:string;
  project:string;
  triggerBody:string;
  triggerName:string;
  updatedAt:string;


}





export function EmailConfirmationDialog({
  isOpen,
  onClose,
  onSend,
  selectedMemberCount,
  isLoading
}: EmailConfirmationDialogProps) {
  const [emailTitle, setEmailTitle] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [template,setTemplate]=useState<Template>()
  const {toast}= useToast()
  const [isPreviewDialogOpen,setIsPreviewDialogOpen]=useState(false)

  // Quill module configurations
  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ script: "sub" }, { script: "super" }],
      [{ indent: "-1" }, { indent: "+1" }],
      ["link"],
      ["clean"],
    ],
  };

  const formats = [
    "header",
    "bold",
    "italic",
    "underline",
    "strike",
    "list",
    "bullet",
    "script",
    "indent",
    "link",
  ];

  const handleSend = ()=>{
    onSend();
    setIsPreviewDialogOpen(false)
  }

const handleSaveTemplate = async () => {
  try {
    if (!template) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Custom template data is missing.",
      });
      return;
    }

    if (!emailTitle.trim() || !emailBody.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter both email title and content.",
      });
      return;
    }

    // Create an updated template with the modified title and body
    const updatedTemplate = {
      triggerTitle: emailTitle,
      triggerBody: emailBody,
    };

    // Call the API to update the custom template
    const response = await fetch(
      `/api/projects/${projectId}/notifications/${template._id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedTemplate),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to save changes.");
    }

    toast({
      title: "Success",
      description: "Custom template updated successfully.",
    });
    setIsPreviewDialogOpen(true);

  } catch (error) {
    toast({
      variant: "destructive",
      title: "Error",
      description: error instanceof Error ? error.message : "Failed to update custom template.",
    });
  }
};
  
  const pathName = usePathname();
  const projectId = pathName.split("/")[3];
useEffect(() => {
  if (isOpen && projectId) {
    fetchTemplate(projectId);
  }
}, [isOpen, projectId]);
const fetchTemplate = async (projectId: string) => {
  try {
    if (!projectId) {
      console.error("Project ID is required");
      return;
    }

    // Fetch the template from the server
    const response = await getCustomNotificationTemplatesByProject(projectId);

    if (response.success && response.templates) {
      const parsedTemplate = JSON.parse(response.templates);
      setTemplate(parsedTemplate);
      setEmailTitle(parsedTemplate.triggerTitle || "Custom Notification");
      setEmailBody(parsedTemplate.triggerBody || "<p>Enter your email content here...</p>");
    } else {
      console.error("Failed to fetch custom template:", response.error || "Unknown error");
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load custom template. Please try again.",
      });
    }
  } catch (error) {
    console.error("Error in fetchTemplate:", error);
    toast({
      variant: "destructive",
      title: "Error",
      description: "Failed to load template. Please refresh and try again.",
    });
  }
};
  return (
    <div>

    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Compose Email</DialogTitle>
          <DialogDescription>
            Sending to {selectedMemberCount} recipient{selectedMemberCount !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <Card className="shadow-lg">
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="emailTitle" className="text-sm font-medium mb-1">Email Title</Label>
                <Input
                  id="emailTitle"
                  value={emailTitle}
                  onChange={(e) => setEmailTitle(e.target.value)}
                  placeholder="Enter email title"
                  className="w-full"
                  />
              </div>

              <div className="relative h-[400px]">
                <Label className="text-sm font-medium mb-1">Email Content</Label>
                <ReactQuill
                  theme="snow"
                  value={emailBody}
                  onChange={setEmailBody}
                  modules={modules}
                  formats={formats}
                  className="h-[300px]"
                  />
              </div>
            </div>
          </CardContent>
        </Card>

        <DialogFooter className="flex flex-col sm:flex-row justify-between gap-4 sm:gap-2 mt-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto"
            >
            Cancel
          </Button>

          <Button
            onClick={handleSaveTemplate}
            disabled={!emailTitle || !emailBody || isLoading}
            className="w-full sm:w-auto"
            >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Preview Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Email Preview</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <h3 className="font-bold text-lg">{emailTitle}</h3>
            <div
              dangerouslySetInnerHTML={{ __html: emailBody }}
              className="prose max-w-none border p-4 rounded-md"
            />
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsPreviewDialogOpen(false)}>
              Back
            </Button>
            <Button onClick={handleSend} disabled={isLoading}>
              {isLoading ? (
                <div className="flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </div>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Email
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    
            </div>
  );
}

export default EmailConfirmationDialog;