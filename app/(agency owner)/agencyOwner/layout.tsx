'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useSidebarToggle } from '@/hooks/use-sidebar-toggle';
import { useStore } from '@/hooks/use-store';
import { Sidebar } from '@/components/admin-panel/sidebar';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
  Users, 
  Upload, 
  FileText, 
  Home, 
  Settings, 
  Bell,
  LogOut,
  Copy,
  Link as LinkIcon
} from 'lucide-react';
import Loader from '@/components/ui/NewLoader/Loader';
import { getUserTeamInfo } from '@/app/actions/user';

export default function AgencyOwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmails, setInviteEmails] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [invitationLink, setInvitationLink] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  const [teamInfo, setTeamInfo] = useState<{name: string} | null>(null);
  const sidebar = useStore(useSidebarToggle, (state) => state);

  // Fetch user team info and generate invitation link on component mount
  useEffect(() => {
    if (session) {
      const fetchTeamInfoAndGenerateLink = async () => {
        try {
          setLinkLoading(true);
          
          const result = await getUserTeamInfo();
          
          if (result.success) {
            // Construct signup URL in the client
            const baseUrl = window.location.origin;
            const teamId = result.team?.id || '';
            const link = `${baseUrl}/auth/signup?role=annotator&team=${teamId}`;
            
            setInvitationLink(link);
            
            if (result.team?.name) {
              setTeamInfo({ name: result.team.name });
            }
          } else {
            console.error('Failed to get team info:', result.error);
            // Fallback to basic link if action fails
            const baseUrl = window.location.origin;
            const link = `${baseUrl}/auth/signup?role=annotator&team=`;
            setInvitationLink(link);
          }
        } catch (error) {
          console.error('Error fetching team info:', error);
          // Fallback to basic link
          const baseUrl = window.location.origin;
          const link = `${baseUrl}/auth/signup?role=annotator&team=`;
          setInvitationLink(link);
        } finally {
          setLinkLoading(false);
        }
      };

      fetchTeamInfoAndGenerateLink();
    }
  }, [session]);

  if (status === 'loading' || !sidebar) {
    return <Loader />;
  }

  if (status === 'unauthenticated') {
    router.push('/auth/login');
    return null;
  }

  if (session?.user?.role !== 'agency owner' && session?.user?.role !== 'project manager') {
    router.push('/');
    return null;
  } 

  // Copy invitation link to clipboard
  const copyInvitationLink = async () => {
    try {
      await navigator.clipboard.writeText(invitationLink);
      toast({
        title: 'Link Copied!',
        description: 'The invitation link has been copied to your clipboard.',
      });
    } catch (error) {
      console.error('Failed to copy link:', error);
      toast({
        variant: 'destructive',
        title: 'Copy Failed',
        description: 'Failed to copy the link. Please try selecting and copying manually.',
      });
    }
  };

  const handleEmailInvite = async () => {
    if (!inviteEmails.trim()) {
      toast({
        variant: 'destructive',
        title: 'No emails provided',
        description: 'Please enter at least one email address to invite',
      });
      return;
    }
  
    setIsLoading(true);
    
    // Split by newline, comma, or semicolon and trim whitespace
    const emails = inviteEmails
      .split(/[\n,;]/)
      .map(email => email.trim())
      .filter(email => email.length > 0);
    
    try {
      const response = await fetch('/api/invite/experts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emails,
          agencyOwnerName: session?.user?.name || 'Your agency owner',
        }),
      });
  
      const data = await response.json();
      
      if (response.ok) {
        // Show a comprehensive summary toast
        const summaryParts = [];
        
        if (data.sent > 0) {
          summaryParts.push(`${data.sent} invitation${data.sent > 1 ? 's' : ''} sent successfully`);
        }
        
        if (data.existingUsers && data.existingUsers.length > 0) {
          summaryParts.push(`${data.existingUsers.length} already registered`);
        }
        
        if (data.alreadyInvitedUsers && data.alreadyInvitedUsers.length > 0) {
          summaryParts.push(`${data.alreadyInvitedUsers.length} already invited`);
        }
        
        if (summaryParts.length > 0) {
          toast({
            title: 'Invitation Summary',
            description: summaryParts.join(', '),
          });
        }
        
        // Show details about existing users if there are any
        if (data.existingUsers && data.existingUsers.length > 0) {
          toast({
            variant: 'default',
            title: 'Already Registered Users',
            description: data.existingUsers.join(', '),
          });
        }
        
        // Show details about already invited users if there are any
        if (data.alreadyInvitedUsers && data.alreadyInvitedUsers.length > 0) {
          toast({
            variant: 'default',
            title: 'Already Invited Users',
            description: data.alreadyInvitedUsers.join(', '),
          });
        }
        
        setInviteEmails('');
        setIsInviteModalOpen(false);
      } else {
        toast({
          variant: 'destructive',
          title: 'Failed to send invitations',
          description: data.error || 'An error occurred while sending invitations',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An unexpected error occurred',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCsvUpload = async () => {
    if (!csvFile) {
      toast({
        variant: 'destructive',
        title: 'No file selected',
        description: 'Please select a CSV file to upload',
      });
      return;
    }
  
    setIsLoading(true);
    
    const formData = new FormData();
    formData.append('file', csvFile);
    formData.append('agencyOwnerName', session?.user?.name || 'Your agency owner');
    
    try {
      const response = await fetch('/api/invite/experts/csv', {
        method: 'POST',
        body: formData,
      });
  
      const data = await response.json();
      
      if (response.ok) {
        // Show a comprehensive summary toast
        const summaryParts = [];
        
        if (data.sent > 0) {
          summaryParts.push(`${data.sent} invitation${data.sent > 1 ? 's' : ''} sent successfully`);
        }
        
        if (data.existingUsers && data.existingUsers.length > 0) {
          summaryParts.push(`${data.existingUsers.length} already registered`);
        }
        
        if (data.alreadyInvitedUsers && data.alreadyInvitedUsers.length > 0) {
          summaryParts.push(`${data.alreadyInvitedUsers.length} already invited`);
        }
        
        if (summaryParts.length > 0) {
          toast({
            title: 'CSV Processing Summary',
            description: summaryParts.join(', '),
          });
        }
        
        // Show details about existing users if there are any
        if (data.existingUsers && data.existingUsers.length > 0) {
          toast({
            variant: 'default',
            title: 'Already Registered Users',
            description: data.existingUsers.join(', '),
          });
        }
        
        // Show details about already invited users if there are any
        if (data.alreadyInvitedUsers && data.alreadyInvitedUsers.length > 0) {
          toast({
            variant: 'default',
            title: 'Already Invited Users',
            description: data.alreadyInvitedUsers.join(', '),
          });
        }
        
        setCsvFile(null);
        setIsInviteModalOpen(false);
      } else {
        toast({
          variant: 'destructive',
          title: 'Failed to process CSV',
          description: data.error || 'An error occurred while processing the CSV file',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An unexpected error occurred',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Sidebar />
      <main
        className={cn(
          "min-h-[calc(100vh_-_56px)] dark:bg-zinc-900 transition-[margin-left] ease-in-out duration-300",
          sidebar?.isOpen === false ? "lg:ml-[90px]" : "lg:ml-72"
        )}
      >
        {/* Top navbar */}
        <header className="bg-white border-b border-gray-200">
          <div className="mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-end h-16">

              <div className="flex items-center">
                <Button 
                  variant="default" 
                  onClick={() => setIsInviteModalOpen(true)}
                  className="mr-4"
                  id="invite-experts-button"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Invite Experts
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => signOut()}
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
            {children}
          </div>
        </div>
      </main>

      {/* Invite Modal */}
      <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Invite Experts</DialogTitle>
            <DialogDescription>
              Invite domain experts to join your agency. They will receive an email with instructions.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Invitation Link Section */}
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg border">
              <div className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                <h3 className="text-sm font-medium">Expert Invitation Link</h3>
              </div>
              <div className="flex items-center space-x-2">
                <Input 
                  value={invitationLink} 
                  readOnly 
                  className="flex-1 font-mono text-xs"
                  placeholder="Invitation link will appear here"
                />
                <Button 
                  onClick={copyInvitationLink}
                  disabled={!invitationLink}
                  size="sm"
                  variant="outline"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-600">
                Share this link with experts to join your team directly
              </p>
            </div>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-2 text-gray-500">OR SEND PERSONALIZED EMAILS</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Option 1: Enter Email Addresses</h3>
              <Textarea
                placeholder="Enter email addresses (one per line, or separated by commas)"
                value={inviteEmails}
                onChange={(e) => setInviteEmails(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-gray-500">
                Enter multiple emails separated by commas, semicolons, or new lines
              </p>
              <Button 
                onClick={handleEmailInvite} 
                disabled={isLoading || !inviteEmails.trim()}
                className="w-full"
              >
                {isLoading ? 'Sending...' : 'Send Invitations'}
              </Button>
            </div>
            
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-2 text-gray-500">OR</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Option 2: Upload CSV File</h3>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-gray-500">
                CSV should have a column named "email" with the email addresses
              </p>
              <Button 
                onClick={handleCsvUpload} 
                disabled={isLoading || !csvFile}
                className="w-full"
              >
                <Upload className="mr-2 h-4 w-4" />
                {isLoading ? 'Uploading...' : 'Upload and Send'}
              </Button>
            </div>
          </div>
          
          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsInviteModalOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}