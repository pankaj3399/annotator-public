'use client';

import React, { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';

interface Props {
  proposalId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId: string;
}

export function ReviewProposalDialog({
  proposalId,
  isOpen,
  onClose,
  onSuccess,
  projectId,
}: Props) {
  const [reviewNotes, setReviewNotes] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();

  const handleReview = async (status: 'approved' | 'rejected') => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/benchmark-proposals/${proposalId}/review`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status,
            reviewNotes,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update proposal');
      }

      toast({
        title: 'Proposal reviewed',
        description: `The proposal has been ${status}`,
      });

      onSuccess();
      onClose();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to review proposal',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setReviewNotes('');
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Review Proposal</DialogTitle>
          <DialogDescription>
            Review this benchmark proposal. Add any notes or feedback before
            making your decision.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-4'>
          <div className='space-y-2'>
            <label className='text-sm font-medium'>Review Notes</label>
            <Textarea
              placeholder='Enter your review notes...'
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              rows={4}
              className='resize-none'
            />
          </div>
        </div>

        <DialogFooter>
          <div className='flex justify-end gap-2'>
            <Button variant='outline' onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              variant='destructive'
              onClick={() => handleReview('rejected')}
              disabled={isLoading}
            >
              Reject
            </Button>
            <Button
              onClick={() => handleReview('approved')}
              disabled={isLoading}
            >
              Approve
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
