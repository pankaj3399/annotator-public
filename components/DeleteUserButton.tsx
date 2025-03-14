'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { deleteUser } from '@/app/actions/user';
import { useToast } from '@/hooks/use-toast';

interface DeleteUserButtonProps {
  userId: string;
  userName: string;
  userEmail: string;
  onDeleted: () => void;
}

export function DeleteUserButton({
  userId,
  userName,
  userEmail,
  onDeleted,
}: DeleteUserButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteUser(userId);

      if (result.success) {
        toast({
          variant: 'default',
          title: 'Success!',
          description: 'User has been deleted successfully',
        });
        setIsOpen(false);
        onDeleted();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to delete user',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An unexpected error occurred',
      });
      console.error('Delete user error:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <button
        className='flex items-center justify-center w-8 h-8 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600 transition-colors'
        onClick={() => setIsOpen(true)}
        aria-label='Delete User'
      >
        <Trash2 className='h-5 w-5' />
      </button>

      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete expert{' '}
              <strong>{userName}</strong> ({userEmail}) and all associated data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className='bg-red-500 text-white hover:bg-red-600'
            >
              {isDeleting ? 'Deleting...' : 'Delete User'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
