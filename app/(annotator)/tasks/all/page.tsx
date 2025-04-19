//app/%28annotator%29/tasks/all/page.tsx
'use client';
import { getTasksByProject, getTasksOfAnnotator } from '@/app/actions/task';
import { SheetMenu } from '@/components/admin-panel/sheet-menu';
import Loader from '@/components/ui/NewLoader/Loader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import TaskTable from '../_components/TaskTable';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectValue,
  SelectItem,
} from '@/components/ui/select';

export interface task {
  _id: string;
  name: string;
  project: string;
  content: string;
  created_at: string;
  status: string;
  submitted: boolean;
  annotator?: string;
  feedback: string;
}
type taskType = 'core' | 'training' | 'test';

export default function ProjectDashboard() {
  const [tasks, setTasks] = useState<task[]>([]);
  const [taskType, setTaskType] = useState<taskType>('core');
  const [activeTab, setActiveTab] = useState('all');
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user.id === undefined) return;
    async function init() {
      setTasks(JSON.parse(await getTasksOfAnnotator(taskType)));
    }
    init();
  }, [session, taskType]);

  if (!session) {
    return <Loader />;
  }

  const filteredTasks = {
    all: tasks,
    submitted: tasks.filter((task) => task && task.submitted === true),
    newTask: tasks.filter((task) => task && task.submitted === false),
    rejected: tasks.filter((task) => task && task.status === 'rejected'),
  };
  return (
    <div className='min-h-screen '>
      <header className='bg-white '>
        <div className='max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center'>
          <h1 className='text-3xl font-bold text-gray-900'>Tasks</h1>
          <div className='flex gap-4 items-center'>
            <Select
              value={taskType}
              onValueChange={(value) =>
                setTaskType(value as 'test' | 'training' | 'core')
              }
            >
              <SelectTrigger>
                <SelectValue>{taskType}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='test'>Test</SelectItem>
                <SelectItem value='training'>Training</SelectItem>
                <SelectItem value='core'>Core</SelectItem>
              </SelectContent>
            </Select>
            <SheetMenu />
          </div>
        </div>
      </header>

      <main className='max-w-7xl mx-auto  sm:px-6 lg:px-8'>
        {tasks.length === 0 ? (
          <div className='text-center py-10'>
            <h2 className='text-xl font-semibold text-gray-900'>
              No Tasks yet
            </h2>
            <p className='mt-2 text-gray-600'>
              No task have been assigned to you
            </p>
          </div>
        ) : (
          <>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className='flex justify-between items-center mb-4'>
                <TabsList>
                  <TabsTrigger value='all'>All Tasks</TabsTrigger>
                  <TabsTrigger value='newTask'>New Tasks</TabsTrigger>
                  <TabsTrigger value='submitted'>Submitted Tasks</TabsTrigger>
                  <TabsTrigger value='rejected'>Rejected Tasks</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value='all'>
                <TaskTable 
                  tasks={filteredTasks.all} 
                  activeTab="all"
                  taskType={taskType}
                />
              </TabsContent>
              <TabsContent value='submitted'>
                <TaskTable 
                  tasks={filteredTasks.submitted} 
                  activeTab="submitted"
                  taskType={taskType}
                />
              </TabsContent>
              <TabsContent value='newTask'>
                <TaskTable 
                  tasks={filteredTasks.newTask} 
                  activeTab="newTask"
                  taskType={taskType}
                />
              </TabsContent>
              <TabsContent value='rejected'>
                <TaskTable 
                  tasks={filteredTasks.rejected} 
                  activeTab="rejected"
                  taskType={taskType}
                />
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </div>
  );
}