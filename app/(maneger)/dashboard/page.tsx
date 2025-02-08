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

  useEffect(() => {
    if (session) {
      if (session?.user?.role === 'annotator') router.push('/tasks');
      init();
      fetchProjects();
    }
  }, [session, router]);

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
