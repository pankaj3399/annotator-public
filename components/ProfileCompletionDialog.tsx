import React from 'react';
import { useRouter } from 'next/navigation';
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
import { Progress } from '@/components/ui/progress';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  UserCircle2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomField {
  _id: string;
  name: string;
  label: string;
  type: 'text' | 'link' | 'file' | 'array';
  isRequired: boolean;
  acceptedFileTypes: string | null;
  isActive: boolean;
}

interface UserData {
  _id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  location?: string;
  domain?: string[];
  lang?: string[];
  permission?: string[];
  lastLogin: string;
  created_at: string;
  linkedin?: string;
  resume?: string;
  nda?: string;
  customFields?: { [key: string]: any };
}

interface CompletionStats {
  percentage: number;
  totalFieldsFilled: number;
  totalFields: number;
  missingRequired: string[];
  missingRecommended: string[];
  missingCustomRequired: string[];
}

interface ProfileCompletionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  completionData: CompletionStats;
}
const ProfileCompletionDialog: React.FC<ProfileCompletionDialogProps> = ({
  isOpen,
  onClose,
  completionData,
}) => {
  const router = useRouter();

  const getCompletionMessage = (percentage: number): string => {
    if (percentage < 40) return 'Your profile needs attention';
    if (percentage < 70) return 'Your profile is coming along';
    if (percentage < 100) return 'Almost there!';
    return 'Profile complete!';
  };

  const getCompletionIcon = (percentage: number) => {
    if (percentage < 70) return AlertCircle;
    if (percentage < 100) return UserCircle2;
    return CheckCircle2;
  };

  const getCompletionColor = (percentage: number): string => {
    if (percentage < 40) return 'text-red-500';
    if (percentage < 70) return 'text-orange-500';
    if (percentage < 100) return 'text-blue-500';
    return 'text-green-500';
  };

  const handleCompleteProfile = (): void => {
    router.push('/profile');
    onClose();
  };

  const CompletionIcon = getCompletionIcon(completionData.percentage);

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className='max-w-xl'>
        <div className='absolute right-4 top-4'>
          <button
            onClick={onClose}
            className='rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground'
          >
            <X className='h-4 w-4' />
            <span className='sr-only'>Close</span>
          </button>
        </div>
        <AlertDialogHeader>
          <AlertDialogTitle className='flex items-center gap-2 text-2xl'>
            <CompletionIcon
              className={cn(
                'h-8 w-8',
                getCompletionColor(completionData.percentage)
              )}
            />
            Complete Your Profile
          </AlertDialogTitle>
          <AlertDialogDescription>
            <div className='space-y-6 mt-4'>
              <div className='bg-muted p-4 rounded-lg'>
                <div className='flex justify-between items-center mb-3'>
                  <span className='text-sm font-medium text-muted-foreground'>
                    Profile Completion Status
                  </span>
                  <span
                    className={cn(
                      'font-semibold text-lg',
                      getCompletionColor(completionData.percentage)
                    )}
                  >
                    {completionData.percentage}%
                  </span>
                </div>
                <Progress
                  value={completionData.percentage}
                  className='h-2.5'
                  style={{
                    background: 'rgba(0,0,0,0.1)',
                  }}
                  {...(completionData.percentage < 40 && {
                    className: 'text-red-500',
                  })}
                  {...(completionData.percentage >= 40 &&
                    completionData.percentage < 70 && {
                      className: 'text-orange-500',
                    })}
                  {...(completionData.percentage >= 70 &&
                    completionData.percentage < 100 && {
                      className: 'text-blue-500',
                    })}
                  {...(completionData.percentage === 100 && {
                    className: 'text-green-500',
                  })}
                />
                <p
                  className={cn(
                    'text-sm font-medium mt-3',
                    getCompletionColor(completionData.percentage)
                  )}
                >
                  {getCompletionMessage(completionData.percentage)}
                </p>
              </div>

              <div className='space-y-3'>
                <h4 className='font-medium text-sm text-muted-foreground mb-2'>
                  Completion Details ({completionData.totalFieldsFilled} of{' '}
                  {completionData.totalFields} fields)
                </h4>
                {completionData.missingRequired.length > 0 && (
                  <div className='flex items-start gap-2 p-3 bg-red-50 rounded-md border border-red-100'>
                    <ChevronRight className='w-4 h-4 mt-0.5 flex-shrink-0 text-red-500' />
                    <p className='text-sm text-red-600'>
                      <span className='font-medium'>
                        Required fields missing:
                      </span>{' '}
                      {completionData.missingRequired.join(', ')}
                    </p>
                  </div>
                )}

                {completionData.missingCustomRequired.length > 0 && (
                  <div className='flex items-start gap-2 p-3 bg-orange-50 rounded-md border border-orange-100'>
                    <ChevronRight className='w-4 h-4 mt-0.5 flex-shrink-0 text-orange-500' />
                    <p className='text-sm text-orange-600'>
                      <span className='font-medium'>
                        Required custom fields missing:
                      </span>{' '}
                      {completionData.missingCustomRequired.join(', ')}
                    </p>
                  </div>
                )}

                {completionData.missingRecommended.length > 0 && (
                  <div className='flex items-start gap-2 p-3 bg-blue-50 rounded-md border border-blue-100'>
                    <ChevronRight className='w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500' />
                    <p className='text-sm text-blue-600'>
                      <span className='font-medium'>Recommended fields:</span>{' '}
                      {completionData.missingRecommended.join(', ')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className='mt-6'>
          <AlertDialogCancel className='text-sm'>Later</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCompleteProfile}
            className='bg-black hover:bg-black/90 text-white flex items-center gap-2'
          >
            Complete Profile
            <ArrowRight className='w-4 h-4' />
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ProfileCompletionDialog;
