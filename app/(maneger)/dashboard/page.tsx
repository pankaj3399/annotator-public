'use client';
import { getGlobalDashboard, getProjectNameAndId, getSelectedProjectsDashboard } from '@/app/actions/dashboard';
import { SheetMenu } from '@/components/admin-panel/sheet-menu';
import Loader from '@/components/ui/NewLoader/Loader';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AverageTaskTimeCardComponent from './[projectId]/_components/average-task-time-card';
import ChartComponent from './[projectId]/_components/chart';
import DashboardOverviewCardComponent from './[projectId]/_components/dashboard-overview-card';
import TaskSubmissionChartComponent from './[projectId]/_components/task-submission-chart';
import MultiSelect from './MultiSelect';
import {toast} from 'sonner'
import { useSearchParams } from 'next/navigation';
import { updateUserTeam } from '@/app/actions/user';

interface DashboardData {
  tasksData: {
    totalTasks: number;
    averageTime: number;
    submittedTasks: number;
    statuses: string[];
    zeroTimeTasks: number;
  };
  projects: number;
  templates: number;
  annotators: number;
}

interface Project {
  id: string;
  name: string;
}

export default function ProjectDashboard() {
  const [data, setData] = useState<DashboardData>({
    tasksData: {
      totalTasks: 0,
      averageTime: 0,
      submittedTasks: 0,
      statuses: [],
      zeroTimeTasks: 0,
    },
    projects: 0,
    templates: 0,
    annotators: 0,
  });

  const [projectNames, setProjectNames] = useState<Project[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const router = useRouter();
  const { data: session } = useSession();
          const searchParams = useSearchParams();

  useEffect(() => {
    if (session) {
      if (session?.user?.role === 'annotator') router.push('/tasks');
      if (session?.user?.role === 'agency owner') router.push('/agencyOwner');
      if (session?.user?.role === 'system admin') router.push('/admin');

      init();
      fetchProjects();
    }
  }, [session, router]);
  useEffect(() => {
    // Function to handle team assignment after Google sign-in
    const handleTeamAssignment = async () => {
      console.log("Checking for team assignment");
      
      if (session?.user) {
        const userId = (session.user as any).id;
        
        console.log("Session user:", {
          id: userId,
          hasTeam: !!(session.user as any).team_id
        });
        
        // Check if user already has a team
        const userHasTeam = !!(session.user as any).team_id;
        
        if (!userHasTeam) {
          console.log("User doesn't have a team, looking for team ID");
          
          // Get search params
          
          // Try to get team ID from multiple sources
          let teamId = null;
          
          // 1. Check URL parameters
          const teamParam = searchParams.get('team');
          if (teamParam) {
            console.log("Found team ID in URL:", teamParam);
            teamId = teamParam;
          }
          
          // 2. If not in URL, check localStorage
          if (!teamId && typeof window !== 'undefined') {
            const storedTeamId = localStorage.getItem('signup_team_id');
            if (storedTeamId) {
              console.log("Found team ID in localStorage:", storedTeamId);
              teamId = storedTeamId;
            }
          }
          
          // 3. If still not found, try to fetch from server cookie
          if (!teamId) {
            try {
              console.log("Trying to fetch team ID from server cookie");
              const response = await fetch('/api/auth/team-cookie');
              const cookieData = await response.json();
              
              if (cookieData.teamId) {
                console.log("Found team ID in server cookie:", cookieData.teamId);
                teamId = cookieData.teamId;
              }
            } catch (error) {
              console.error("Error fetching team cookie:", error);
            }
          }
          
          // If we found a team ID, update the user
          if (teamId && userId) {
            console.log("Updating user with team ID:", teamId);
            
            try {
              const result = await updateUserTeam(userId, teamId);
              
              if (result.success) {
                console.log("Successfully updated user's team:", result);
                
                toast.success(`You've been assigned to ${result.team?.name || 'your team'}`);
                
                // Clear stored team ID from localStorage
                if (typeof window !== 'undefined') {
                  localStorage.removeItem('signup_team_id');
                }
                
                // Clear the cookie by making a request to an API endpoint
                try {
                  await fetch('/api/auth/clear-team-cookie', { method: 'POST' });
                  console.log("Team cookie cleared");
                } catch (clearError) {
                  console.error("Error clearing team cookie:", clearError);
                }
                
                // Refresh session to get updated team ID
                setTimeout(() => {
                  window.location.reload();
                }, 1000);
              }else {
                console.error("Failed to update user's team:", result.error);
                toast.error("Failed to assign team");
              }
            } catch (error) {
              console.error("Error updating user's team:", error);
              toast.error("Error assigning team");
            }
          } else {
            console.log("No team ID found to assign to user");
          }
        }
      }
    };
    
    handleTeamAssignment();
  }, [session]);
  useEffect(() => {
    if (selectedProjects.length > 0) {
      fetchSelectedProjectsDashboard();
    } else {
      init(); // Reset to global data when no projects are selected
    }
  }, [selectedProjects]);

  async function init() {
    setIsLoading(true); // Show loader when fetching data
    try {
      const res = await getGlobalDashboard();
      if (typeof res === 'string') {
        const data: DashboardData = JSON.parse(res);
        setData(data);
      } else if ('error' in res) {
        console.error('Error fetching dashboard data:', res.error);
      } else {
        console.error('Unexpected response format:', res);
      }
    } catch (error) {
      console.error('Error in init function:', error);
    } finally {
      setIsLoading(false); // Hide loader once data is fetched
    }
  }

  async function fetchProjects() {
    setIsLoading(true); // Show loader when fetching project names
    try {
      const projectNamesString = await getProjectNameAndId();
      const projectNames = JSON.parse(projectNamesString);
      setProjectNames(projectNames);
      toast.success("Currently showing all project's data")
    } catch (error) {
      console.error("Error fetching project names:", error);
      toast.error("Failed to fetch data");
      setProjectNames([]);
    } finally {
      setIsLoading(false); // Hide loader once project names are fetched
    }
  }

  async function fetchSelectedProjectsDashboard() {
    setIsLoading(true); // Show loader when fetching selected projects data
    try {
      const res = await getSelectedProjectsDashboard(selectedProjects);
      if (typeof res === 'string') {
        const dashboardData: DashboardData = JSON.parse(res);
        setData(dashboardData);
      } else if ('error' in res) {
        console.error('Error fetching selected projects dashboard data:', res.error);
      } else {
        console.error('Unexpected response format:', res);
      }
    } catch (error) {
      console.error('Error fetching selected projects dashboard data:', error);
    } finally {
      setIsLoading(false); // Hide loader once selected projects data is fetched
    }
  }

  if (!session || isLoading) {
    return <Loader />;
  }

  return (
    <div className='min-h-screen'>
      <header className='bg-white'>
        <div className='max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center'>
          <div className='flex items-center gap-4 justify-between w-full'>
            <h1 className='text-3xl font-bold text-gray-900 tracking-tight'>
              Dashboard
            </h1>
            <div>
              <MultiSelect
                selectedMembers={selectedProjects}
                setSelectedMembers={setSelectedProjects}
              />
            </div>
          </div>
          <SheetMenu />
        </div>
      </header>
      <main className='w-full mx-auto space-y-5 sm:px-6 lg:px-8'>
        <div className='flex gap-5'>
          <ChartComponent
            statuses={data.tasksData.statuses || []}
            totalTasks={data.tasksData.totalTasks || 0}
          />
          <AverageTaskTimeCardComponent
            time={data.tasksData.averageTime || 0}
            totalTasks={data.tasksData.totalTasks || 0}
          />
          <TaskSubmissionChartComponent
            totalTasks={data.tasksData.totalTasks || 0}
            submittedTasks={
              data.tasksData.zeroTimeTasks
                ? data.tasksData.totalTasks - data.tasksData.zeroTimeTasks
                : 0
            }
          />
        </div>
        <DashboardOverviewCardComponent
          projects={data.projects || 0}
          templates={data.templates || 0}
          annotator={data.annotators || 0}
          totalTasks={data.tasksData.totalTasks || 0}
        />
      </main>
    </div>
  );
}
