'use client'
import { getTasksOfAnnotator } from "@/app/actions/task"
import { SheetMenu } from "@/components/admin-panel/sheet-menu"
import Loader from '@/components/ui/Loader/Loader'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import TaskTable from "../_components/TaskTable"

export interface task {
  _id: string
  name: string
  project: string
  content: string
  created_at: string
  status: string
  submitted: boolean
  annotator?: string
  feedback: string
}

export default function ProjectDashboard() {
  const [tasks, setTasks] = useState<task[]>([])
  const [activeTab, setActiveTab] = useState("all")
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user.id === undefined) return
    async function init() {
      setTasks(JSON.parse(await getTasksOfAnnotator()))
    }
    init();
  }, [session]);

  if (!session) {
    return <Loader />;
  }

  const filteredTasks = {
    all: tasks,
    submitted: tasks.filter(task => task.submitted),
    "newTask": tasks.filter(task => !task.submitted),
    'rejected': tasks.filter(task => task.status === 'rejected'),
  }

  return (
    <div className="min-h-screen ">
      <header className="bg-white ">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
          <SheetMenu />
        </div>
      </header>
      <main className="max-w-7xl mx-auto  sm:px-6 lg:px-8">

        {tasks.length === 0 ? (
          <div className="text-center py-10">
            <h2 className="text-xl font-semibold text-gray-900">No Tasks yet</h2>
            <p className="mt-2 text-gray-600">No task have been assigned to you</p>
          </div>
        ) : (
          <>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex justify-between items-center mb-4">
                <TabsList>
                  <TabsTrigger value="all">All Tasks</TabsTrigger>
                  <TabsTrigger value="newTask">New Tasks</TabsTrigger>
                  <TabsTrigger value="submitted">Submitted Tasks</TabsTrigger>
                  <TabsTrigger value="rejected">Rejected Tasks</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="all">
                <TaskTable tasks={filteredTasks.all} />
              </TabsContent>
              <TabsContent value="submitted">
                <TaskTable tasks={filteredTasks.submitted} />
              </TabsContent>
              <TabsContent value="newTask">
                <TaskTable tasks={filteredTasks.newTask} />
              </TabsContent>
              <TabsContent value="rejected">
                <TaskTable tasks={filteredTasks.rejected} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </div>
  )
}
