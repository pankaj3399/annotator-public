'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Users, Mail, Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

interface InvitedUser {
  id: string;
  email: string;
  status: 'pending' | 'accepted';
  invitedAt: string;
  expiresAt?: string; // Made optional
  acceptedAt: string | null;
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
}

interface InvitedUserCounts {
  pending: number;
  accepted: number;
  total: number;
}

export default function AgencyOwnerDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [invitedUsers, setInvitedUsers] = useState<InvitedUser[]>([]);
  const [counts, setCounts] = useState<InvitedUserCounts>({
    pending: 0,
    accepted: 0,
    total: 0
  });
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState('all');

  useEffect(() => {
    const fetchInvitedUsers = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/agency/invited-users?status=${currentTab}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch invited users');
        }
        
        const data = await response.json();
        
        if (data.success) {
          setInvitedUsers(data.invitedUsers);
          setCounts(data.counts);
        } else {
          throw new Error(data.error || 'Unknown error');
        }
      } catch (error) {
        console.error('Error fetching invited users:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load invited users. Please try again.',
        });
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      fetchInvitedUsers();
    }
  }, [session, currentTab, toast]);

  // Safe date formatting function
  const safeFormatDate = (dateValue: string | null | undefined) => {
    if (!dateValue) return 'N/A';
    
    try {
      // Make sure dateValue is a valid Date
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      return format(date, 'PPP');  // Using the same format as in your original code
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'accepted':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-200">Pending</Badge>;
      case 'accepted':
        return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">Accepted</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agency Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {session?.user?.name}. Manage your invited experts below.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Invitations</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-2xl font-bold">{counts.total}</div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-2xl font-bold">{counts.pending}</div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Accepted</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-2xl font-bold">{counts.accepted}</div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Invited Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Invited Experts</CardTitle>
          <CardDescription>
            Track the status of your expert invitations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" onValueChange={setCurrentTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="accepted">Accepted</TabsTrigger>
            </TabsList>
            
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-4 w-[200px]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : invitedUsers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-gray-400" />
                <h3 className="mt-2 text-lg font-medium">No invitations found</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {currentTab === 'all' 
                    ? "You haven't sent any invitations yet." 
                    : `You don't have any ${currentTab} invitations.`}
                </p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => document.getElementById('invite-experts-button')?.click()}
                >
                  Invite new experts
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {invitedUsers.map((user) => (
                  <div key={user.id} className="py-4 flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="rounded-full p-2 bg-primary/10">
                        {getStatusIcon(user.status)}
                      </div>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {user.email}
                          {getStatusBadge(user.status)}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Invited on {safeFormatDate(user.invitedAt)}
                        </div>
                        {user.status === 'accepted' && user.acceptedAt && (
                          <div className="text-sm text-green-600 mt-1">
                            Accepted on {safeFormatDate(user.acceptedAt)}
                          </div>
                        )}
                        {/* Only show expiration if the field exists */}
                        {user.status === 'pending' && user.expiresAt && (
                          <div className="text-sm text-yellow-600 mt-1">
                            Expires on {safeFormatDate(user.expiresAt)}
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-between border-t p-4">
          <div className="text-sm text-muted-foreground">
            Showing {invitedUsers.length} of {counts.total} invitations
          </div>
          {invitedUsers.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => document.getElementById('invite-experts-button')?.click()}
            >
              <Mail className="mr-2 h-4 w-4" />
              Invite More
            </Button>
          )}
        </CardFooter>
      </Card>
      
      {/* Hidden button for invitation modal trigger */}
      <button id="invite-experts-button" className="hidden"></button>
    </div>
  );
}