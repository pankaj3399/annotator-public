import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Facebook, 
  Twitter, 
  Linkedin, 
  MessageCircle, 
  Mail,
  Link as LinkIcon,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
}

const ShareDialog = ({ open, onOpenChange, url }: ShareDialogProps) => {
  const shareButtons = [
    {
      label: "Embed",
      icon: <LinkIcon className="h-5 w-5" />,
      onClick: () => {},
      className: "bg-gray-100 hover:bg-gray-200"
    },
    {
      label: "Facebook",
      icon: <Facebook className="h-5 w-5" />,
      onClick: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank'),
      className: "bg-[#1877f2] hover:bg-[#0d6efd] text-white"
    },
    {
      label: "X",
      icon: <Twitter className="h-5 w-5" />,
      onClick: () => window.open(`https://twitter.com/intent/tweet?url=${url}`, '_blank'),
      className: "bg-black hover:bg-gray-800 text-white"
    },
    {
      label: "LinkedIn",
      icon: <Linkedin className="h-5 w-5" />,
      onClick: () => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank'),
      className: "bg-[#0a66c2] hover:bg-[#095299] text-white"
    },
    {
      label: "WhatsApp",
      icon: <MessageCircle className="h-5 w-5" />,
      onClick: () => window.open(`https://api.whatsapp.com/send?text=${url}`, '_blank'),
      className: "bg-[#25d366] hover:bg-[#1fb959] text-white"
    },
    {
      label: "Email",
      icon: <Mail className="h-5 w-5" />,
      onClick: () => window.open(`mailto:?body=${url}`, '_blank'),
      className: "bg-gray-500 hover:bg-gray-600 text-white"
    }
  ];

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Share</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <div className="flex space-x-2 overflow-x-auto pb-2 px-1 justify-center">
            {shareButtons.map((button, index) => (
              <button
                key={index}
                onClick={button.onClick}
                className={`flex flex-col items-center p-3 rounded-full ${button.className} min-w-[48px]`}
              >
                {button.icon}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center space-x-2 mt-4">
          <div className="grid flex-1 gap-2">
            <div className="flex items-center p-2 border rounded-md bg-background">
              <span className="text-sm text-gray-500 truncate">{url}</span>
            </div>
          </div>
          <Button type="button" onClick={handleCopy} className="px-3">
            Copy
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareDialog;