'use client';

import { getTasksByProject, getTasksOfAnnotator } from '@/app/actions/task';
import { getLabels } from '@/app/actions/label';
import { SheetMenu } from '@/components/admin-panel/sheet-menu';
import Loader from '@/components/ui/Loader/Loader';
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
import { BenchmarkProposalForm } from '@/components/BenchmarkProposal';
import { toast } from 'sonner';

export interface Task {
  _id: string;
  name: string;
  project: string;
  content: string;
  created_at: string;
  status: string;
  submitted: boolean;
  annotator?: string;
  feedback: string;
  template: {
    _id: string;
    labels: string[];
  };
}

interface CustomLabel {
  name: string;
  color?: string;
}

type TaskType = 'core' | 'training' | 'test';
type LabelType =
  | 'LLM BENCHMARK'
  | 'MULTIMODALITY'
  | 'TRANSLATION'
  | 'ACCENTS'
  | 'ENGLISH'
  | string;

export default function ProjectDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskType, setTaskType] = useState<TaskType>('core');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedLabels, setSelectedLabels] = useState<LabelType[]>([]);
  const [customLabels, setCustomLabels] = useState<CustomLabel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { data: session } = useSession();

  const labelStyles: Record<string, string> = {
    'LLM BENCHMARK': 'bg-yellow-200 text-yellow-800',
    MULTIMODALITY: 'bg-orange-200 text-orange-800',
    TRANSLATION: 'bg-cyan-200 text-cyan-800',
    ACCENTS: 'bg-pink-200 text-pink-800',
    ENGLISH: 'bg-gray-200 text-gray-800',
  };

  const getLabelStyle = (label: string) => {
    if (labelStyles[label]) {
      return labelStyles[label];
    }
    return 'bg-gray-200 text-gray-800';
  };

  // Fetch tasks when taskType changes or session changes
  useEffect(() => {
    if (session?.user?.id === undefined) return;

    async function fetchTasks() {
      try {
        setIsLoading(true);
        const tasksResponse = await getTasksOfAnnotator(taskType);
        const tasksData = JSON.parse(tasksResponse);
        console.log('Fetched tasks:', tasksData);
        console.log('Selected labels:', selectedLabels);
        setTasks(tasksData);
      } catch (error) {
        console.error('Error fetching tasks:', error);
        toast.error('Failed to load tasks');
      } finally {
        setIsLoading(false);
      }
    }

    fetchTasks();
  }, [session?.user?.id, taskType]);

  // Fetch custom labels
  useEffect(() => {
    const fetchCustomLabels = async () => {
      try {
        const fetchedLabels = await getLabels();
        const parsedLabels = JSON.parse(fetchedLabels);
        setCustomLabels(parsedLabels || []);
      } catch (error) {
        console.error('Error fetching custom labels:', error);
        toast.error('Failed to load labels');
      }
    };

    fetchCustomLabels();
  }, []);

  const getFilteredTasks = (tasksToFilter: Task[]) => {
    if (selectedLabels.length === 0) return tasksToFilter;

    return tasksToFilter.filter((task) => {
      if (!task.template?.labels) return false;

      return selectedLabels.every((selectedLabel) =>
        task.template.labels.some((templateLabel) => {
          // Normalize both labels for comparison
          const normalizedTemplateLabel =
            typeof templateLabel === 'string'
              ? templateLabel.trim().toUpperCase()
              : JSON.stringify(templateLabel).trim().toUpperCase();

          const normalizedSelectedLabel = selectedLabel.trim().toUpperCase();

          return normalizedTemplateLabel === normalizedSelectedLabel;
        })
      );
    });
  };

  // Handle label selection
  const handleLabelClick = (label: LabelType) => {
    setSelectedLabels((prev) => {
      if (prev.includes(label)) {
        return prev.filter((l) => l !== label);
      } else {
        return [...prev, label];
      }
    });
  };

  // Get filtered tasks for each tab
  const filteredTasks = {
    all: getFilteredTasks(tasks),
    submitted: getFilteredTasks(tasks.filter((task) => task.submitted)),
    newTask: getFilteredTasks(tasks.filter((task) => !task.submitted)),
    rejected: getFilteredTasks(
      tasks.filter((task) => task.status === 'rejected')
    ),
  };

  // Check if benchmark button should be shown
  const showBenchmarkButton = tasks.some((task) =>
    task.template?.labels?.some((label) => {
      try {
        return JSON.parse(label) === 'LLM BENCHMARK';
      } catch {
        return label === 'LLM BENCHMARK';
      }
    })
  );

  // Loading states
  if (!session) return <Loader />;
  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <Loader />
      </div>
    );
  }

  return (
    <div className='min-h-screen'>
      <header className='bg-white'>
        <div className='max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center'>
          <h1 className='text-3xl font-bold text-gray-900'>Tasks</h1>
          <div className='flex gap-4 items-center'>
            {showBenchmarkButton && <BenchmarkProposalForm tasks={tasks} />}
            <Select
              value={taskType}
              onValueChange={(value) => setTaskType(value as TaskType)}
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

      <main className='max-w-7xl mx-auto sm:px-6 lg:px-8'>
        {/* Label filter buttons */}
        <div className='flex flex-wrap gap-3 mb-6 mt-4'>
          {[
            ...Object.keys(labelStyles),
            ...customLabels.map((label) => label.name),
          ].map((label) => (
            <button
              key={label}
              onClick={() => handleLabelClick(label)}
              className={`
                px-4 py-2 rounded-md transition-all duration-200
                ${getLabelStyle(label)}
                ${
                  selectedLabels.includes(label)
                    ? 'ring-2 ring-offset-2 ring-opacity-60 ring-current shadow-md scale-105'
                    : 'hover:scale-105 active:scale-95'
                }
                font-medium text-sm
                transform hover:shadow-md
              `}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Task display */}
        {filteredTasks.all.length === 0 ? (
          <div className='text-center py-10'>
            <h2 className='text-xl font-semibold text-gray-900'>
              No Tasks Found
            </h2>
            <p className='mt-2 text-gray-600'>
              {selectedLabels.length > 0
                ? 'No tasks match the selected labels'
                : 'No tasks have been assigned to you'}
            </p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className='flex justify-between items-center mb-4'>
              <TabsList>
                <TabsTrigger value='all'>
                  All Tasks ({filteredTasks.all.length})
                </TabsTrigger>
                <TabsTrigger value='newTask'>
                  New Tasks ({filteredTasks.newTask.length})
                </TabsTrigger>
                <TabsTrigger value='submitted'>
                  Submitted Tasks ({filteredTasks.submitted.length})
                </TabsTrigger>
                <TabsTrigger value='rejected'>
                  Rejected Tasks ({filteredTasks.rejected.length})
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value='all'>
              <TaskTable tasks={filteredTasks.all} />
            </TabsContent>
            <TabsContent value='submitted'>
              <TaskTable tasks={filteredTasks.submitted} />
            </TabsContent>
            <TabsContent value='newTask'>
              <TaskTable tasks={filteredTasks.newTask} />
            </TabsContent>
            <TabsContent value='rejected'>
              <TaskTable tasks={filteredTasks.rejected} />
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
