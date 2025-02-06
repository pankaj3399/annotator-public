'use client'
import { getProjectDashboard } from '@/app/actions/dashboard'
import { SheetMenu } from '@/components/admin-panel/sheet-menu'
import Loader from '@/components/ui/Loader/Loader'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import AverageTaskTimeCardComponent from "./_components/average-task-time-card"
import ChartComponent from "./_components/chart"
import TaskSubmissionChartComponent from "./_components/task-submission-chart"
import ProjectDashboardCard from './_components/dashboard-overview-card-project'

export interface Project {
  _id: string
  name: string
  created_at: string
}

interface DashboardData {
  tasksData: {
    totalTasks: number;
    averageTime: number;
    submittedTasks: number;
    statuses: string[];
  };
  rework: number;
  annotators: number;
  projects: number;
  templates: number;
}

export const dynamic = 'force-dynamic'

export default function ProjectDashboard() {
  const [data, setData] = useState<DashboardData>({
    "tasksData": {
      "totalTasks": 0,
      "averageTime": 0,
      "submittedTasks": 0,
      "statuses": []
    },
    "rework": 0,
    "projects": 0,
    "templates": 0,
    "annotators": 0
  })

  const router = useRouter();
  const pathName = usePathname();
  const projectId = pathName.split("/")[2];
  const { data: session } = useSession();

  useEffect(() => {
    if (session) {
      if (session?.user?.role === 'annotator') router.push('/tasks');
      init();
    }
  }, [session, router]);

  async function init() {
    try {
      const res = await getProjectDashboard(projectId);
      
      if (typeof res === 'string') {
        // If res is a string, it's a JSON response
        const data: DashboardData = JSON.parse(res);
        setData(data);
      } else if ('error' in res) {
        // If res has an 'error' property, it's an error response
        console.error('Error fetching dashboard data:', res.error);
        // Handle the error appropriately, e.g., show an error message to the user
      } else {
        // Unexpected response format
        console.error('Unexpected response format:', res);
      }
    } catch (error) {
      console.error('Error in init function:', error);
    }
  }


  if (!session) {
    return <Loader />;
  }

  if (session?.user?.role === 'project manager')
    return (
      <div className="min-h-screen ">
        <header className="bg-white ">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
            <SheetMenu />
          </div>
        </header>
        <main className="w-full mx-auto space-y-5  sm:px-6 lg:px-8">
          <div className="flex gap-5">

            <ChartComponent statuses={data.tasksData.statuses? data.tasksData.statuses : []} totalTasks={data.tasksData.totalTasks? data.tasksData.totalTasks : 0} />
            <AverageTaskTimeCardComponent time={data.tasksData.averageTime? data.tasksData.averageTime : 0} totalTasks={data.tasksData.totalTasks? data.tasksData.totalTasks : 0} />
            <TaskSubmissionChartComponent totalTasks={data.tasksData.totalTasks? data.tasksData.totalTasks : 0} submittedTasks={data.tasksData.submittedTasks? data.tasksData.submittedTasks : 0}  />
          </div>
          <ProjectDashboardCard rework={data.rework? data.rework : 0} annotator={data.annotators? data.annotators : 0} totalTasks={data.tasksData.totalTasks? data.tasksData.totalTasks : 0} />
        </main>
      </div>
    )
}