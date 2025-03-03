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
import InvitationStatusChart from '@/components/InvitationStatusChart';
import InvitedUserTasksChart from '@/components/InvitedUserTasksChart';
import { getAnnotatorTasks, getAnnotatorCompletedTasks } from '@/app/actions/annotatorTask';

interface InvitedUser {
  id: string;
  email: string;
  status: 'pending' | 'accepted';
  invitedAt: string;
  expiresAt?: string;
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

interface Task {
  _id: string;
  timeTaken: number;
  submitted: boolean;
  status: string;
  updatedAt: string;
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
  
  // Task-related state
  const [assignedTasks, setAssignedTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);

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

    const fetchAllTasks = async () => {
      try {
        setTasksLoading(true);
        
        // Fetch all assigned tasks
        const assignedResult = await getAnnotatorTasks();
        if (assignedResult.error) {
          throw new Error(assignedResult.error);
        }
        
        // Fetch completed tasks
        const completedResult = await getAnnotatorCompletedTasks();
        if (completedResult.error) {
          throw new Error(completedResult.error);
        }
        
        // Parse the results
        if (assignedResult.data) {
          const parsedAssigned = JSON.parse(assignedResult.data);
          setAssignedTasks(parsedAssigned);
        }
        
        if (completedResult.data) {
          const parsedCompleted = JSON.parse(completedResult.data);
          setCompletedTasks(parsedCompleted);
        }
      } catch (error) {
        console.error('Error fetching tasks:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load tasks. Please try again.',
        });
      } finally {
        setTasksLoading(false);
      }
    };

    if (session) {
      fetchInvitedUsers();
      fetchAllTasks();
    }
  }, [session, currentTab, toast]);

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Agency Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {session?.user?.name}. Manage your invited experts below.
          </p>
        </div>
      </div>

      {/* Task Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-md p-4 border border-gray-100">
          <div className="text-sm font-medium text-gray-500">Total Assigned</div>
          <div className="text-2xl md:text-3xl font-bold mt-1">{assignedTasks.length}</div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-4 border border-gray-100">
          <div className="text-sm font-medium text-gray-500">Completed</div>
          <div className="text-2xl md:text-3xl font-bold mt-1 text-green-600">{completedTasks.length}</div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-4 border border-gray-100">
          <div className="text-sm font-medium text-gray-500">Pending</div>
          <div className="text-2xl md:text-3xl font-bold mt-1 text-amber-500">
            {assignedTasks.length - completedTasks.length}
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        {/* Invitation Status Chart */}
        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Skeleton className="h-48 w-48 rounded-full" />
              </div>
            ) : (
              <InvitationStatusChart counts={counts} />
            )}
          </CardContent>
        </Card>

        {/* Task Charts */}
        <InvitedUserTasksChart 
          assignedTasks={assignedTasks} 
          completedTasks={completedTasks} 
          loading={tasksLoading} 
        />
      </div>

      {/* Hidden button for invitation modal trigger */}
      <button id="invite-experts-button" className="hidden"></button>
    </div>
  );
}