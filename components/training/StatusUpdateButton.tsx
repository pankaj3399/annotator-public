// src/components/training/StatusUpdateButton.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CheckCircle, Clock, Radio, XCircle, ChevronDown, Loader2 } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

type WebinarStatus = "scheduled" | "live" | "completed" | "cancelled";

interface StatusUpdateButtonProps {
  webinarId: string;
  currentStatus: WebinarStatus;
  onStatusUpdate?: (newStatus: WebinarStatus) => void;
}

export function StatusUpdateButton({ 
  webinarId, 
  currentStatus, 
  onStatusUpdate 
}: StatusUpdateButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleStatusUpdate = async (newStatus: WebinarStatus) => {
    if (newStatus === currentStatus) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/training/webinar/status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          webinarId,
          status: newStatus
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update status');
      }

      toast({
        title: "Status Updated",
        description: `Webinar status changed to ${newStatus}`,
      });

      // Call the callback if provided
      if (onStatusUpdate) {
        onStatusUpdate(newStatus);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Could not update status",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: WebinarStatus) => {
    switch (status) {
      case 'live': return <Radio className="mr-2 h-4 w-4" />;
      case 'completed': return <CheckCircle className="mr-2 h-4 w-4" />;
      case 'scheduled': return <Clock className="mr-2 h-4 w-4" />;
      case 'cancelled': return <XCircle className="mr-2 h-4 w-4" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={isLoading}>
        <Button variant="outline" size="sm">
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <>
              {getStatusIcon(currentStatus)}
              Update Status
              <ChevronDown className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => handleStatusUpdate('scheduled')}
          disabled={currentStatus === 'scheduled'}
        >
          <Clock className="mr-2 h-4 w-4" />
          Mark as Scheduled
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleStatusUpdate('live')}
          disabled={currentStatus === 'live'}
        >
          <Radio className="mr-2 h-4 w-4" />
          Mark as Live
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleStatusUpdate('completed')}
          disabled={currentStatus === 'completed'}
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          Mark as Completed
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleStatusUpdate('cancelled')}
          disabled={currentStatus === 'cancelled'}
        >
          <XCircle className="mr-2 h-4 w-4" />
          Mark as Cancelled
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}