'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Radio, CheckCircle, XCircle, Clock, Mail } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { RecordingButton } from './RecordingButton';
import { StatusUpdateButton } from './StatusUpdateButton';
import { InviteModal } from './InviteModal';

// Type definitions
type WebinarStatus = 'scheduled' | 'live' | 'completed' | 'cancelled';

interface SerializedWebinarSession {
  _id: string;
  title: string;
  description?: string;
  roomId: string | null;
  scheduledAt: string | null;
  duration?: number;
  status: WebinarStatus;
  recordedVideo: {
    url: string | null;
    uploadedAt: string | null;
    duration: number | null;
  };
  instructor: string;
}

interface TrainingWebinarListProps {
  webinars: SerializedWebinarSession[];
  trainingId: string; // Add training ID to pass to invite modal
}

export function TrainingWebinarList({
  webinars: initialWebinars,
  trainingId,
}: TrainingWebinarListProps) {
  // State to manage webinars after status updates
  const [webinars, setWebinars] =
    useState<SerializedWebinarSession[]>(initialWebinars);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedWebinar, setSelectedWebinar] =
    useState<SerializedWebinarSession | null>(null);

  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role;
  const userName =
    (session?.user as { name?: string })?.name || 'Project Manager';
  const isProjectManager = userRole === 'project manager';

  const canJoinWebinar = (webinar: SerializedWebinarSession): boolean => {
    return (
      (webinar.status === 'live' || webinar.status === 'scheduled') &&
      (userRole === 'project manager' || userRole === 'annotator')
    );
  };

  const getStatusBadge = (status: SerializedWebinarSession['status']) => {
    switch (status) {
      case 'live':
        return (
          <Badge variant='destructive'>
            <Radio className='mr-1 h-3 w-3' /> Live
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant='secondary'>
            <CheckCircle className='mr-1 h-3 w-3' /> Completed
          </Badge>
        );
      case 'scheduled':
        return (
          <Badge variant='outline'>
            <Clock className='mr-1 h-3 w-3' /> Scheduled
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant='outline' className='text-muted-foreground'>
            <XCircle className='mr-1 h-3 w-3' /> Cancelled
          </Badge>
        );
      default:
        return <Badge variant='outline'>{status}</Badge>;
    }
  };

  // Handle status update in the local state
  const handleStatusUpdate = (webinarId: string, newStatus: WebinarStatus) => {
    setWebinars((prevWebinars) =>
      prevWebinars.map((webinar) =>
        webinar._id === webinarId ? { ...webinar, status: newStatus } : webinar
      )
    );
  };

  // Open invite modal for a specific webinar
  const openInviteModal = (webinar: SerializedWebinarSession) => {
    setSelectedWebinar(webinar);
    setIsInviteModalOpen(true);
  };

  return (
    <>
      <div className='space-y-4'>
        {webinars.map((webinar) => (
          <Card key={webinar._id}>
            <CardHeader className='pb-4'>
              <div className='flex items-start justify-between gap-2'>
                <CardTitle className='text-lg'>{webinar.title}</CardTitle>
                {getStatusBadge(webinar.status)}
              </div>
              {webinar.scheduledAt && (
                <CardDescription className='text-xs text-muted-foreground'>
                  Scheduled: {format(new Date(webinar.scheduledAt), 'PPp')}
                  {webinar.duration && ` (~${webinar.duration} mins)`}
                </CardDescription>
              )}
            </CardHeader>
            {webinar.description && (
              <CardContent className='pb-4 pt-0'>
                <p className='text-sm text-muted-foreground'>
                  {webinar.description}
                </p>
              </CardContent>
            )}
            <CardFooter className='flex flex-wrap items-center gap-2 pt-0'>
              {canJoinWebinar(webinar) && (
                <Button asChild size='sm'>
                  <Link href={`/training/${webinar._id}`}>
                    <Radio className='mr-2 h-4 w-4' /> Join Session
                  </Link>
                </Button>
              )}

              {/* Invite annotators button for project managers */}
              {isProjectManager && webinar.status !== 'cancelled' && (
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => openInviteModal(webinar)}
                >
                  <Mail className='mr-2 h-4 w-4' /> Invite Experts
                </Button>
              )}

              {/* Status update button for project managers */}
              {isProjectManager && (
                <StatusUpdateButton
                  webinarId={webinar._id}
                  currentStatus={webinar.status}
                  onStatusUpdate={(newStatus) =>
                    handleStatusUpdate(webinar._id, newStatus)
                  }
                />
              )}

              {/* Recording button for completed webinars */}
              <RecordingButton
                webinarId={webinar._id}
                isCompleted={webinar.status === 'completed'}
              />

              {!canJoinWebinar(webinar) &&
                webinar.status !== 'completed' &&
                webinar.status !== 'cancelled' && (
                  <span className='text-xs text-muted-foreground italic'>
                    {`Session is ${webinar.status}.`}
                  </span>
                )}
              {webinar.status === 'cancelled' && (
                <span className='text-xs text-muted-foreground italic'>
                  Session Cancelled
                </span>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Invite Modal */}
      {selectedWebinar && (
        <InviteModal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          trainingId={trainingId}
          webinarId={selectedWebinar._id}
          webinarTitle={selectedWebinar.title}
          webinarDescription={selectedWebinar.description}
          scheduledAt={selectedWebinar.scheduledAt}
          projectManagerName={userName}
        />
      )}
    </>
  );
}
