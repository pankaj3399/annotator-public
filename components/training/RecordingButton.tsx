// src/components/training/RecordingButton.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Video, Loader2 } from 'lucide-react';
import ReactPlayer from 'react-player/lazy';
import { useToast } from "@/components/ui/use-toast";
import Loader from '../ui/NewLoader/Loader';

interface RecordingButtonProps {
  webinarId: string;
  isCompleted: boolean;
}

export function RecordingButton({ webinarId, isCompleted }: RecordingButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchRecording = async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const response = await fetch(`/api/hms/recordings/${webinarId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch recording');
      }

      if (data.url) {
        setRecordingUrl(data.url);
        setDialogOpen(true);
      } else {
        setLoadError('Recording not available');
        toast({
          variant: "destructive",
          title: "Error",
          description: "Recording not available yet."
        });
      }
    } catch (error: any) {
      setLoadError(error.message || 'Failed to load recording');
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Could not load recording"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Reset recording URL when dialog closes to get a fresh presigned URL next time
  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setRecordingUrl(null);
    }
  };

  // Don't show the button if the webinar isn't completed
  if (!isCompleted) {
    return null;
  }

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={fetchRecording}
        disabled={isLoading}
      >
        {isLoading ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...</>
        ) : (
          <><Video className="mr-2 h-4 w-4" /> View Recording</>
        )}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="max-w-4xl p-0 sm:p-0">
          {recordingUrl ? (
            <div className="aspect-video overflow-hidden rounded-lg bg-black">
              {typeof window !== 'undefined' && (
                <ReactPlayer
                  url={recordingUrl}
                  controls
                  playing
                  width="100%"
                  height="100%"
                  onError={(e) => {
                    console.error('ReactPlayer Error:', e);
                    setLoadError('Error playing the video');
                    toast({
                      variant: "destructive",
                      title: "Error",
                      description: "Could not play the video. The link may have expired."
                    });
                  }}
                />
              )}
            </div>
          ) : (
          <Loader/>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}