//app/projects/task/[projectId]/page.tsx
'use client';

import { addJob } from '@/app/actions/aiModel';
import { getAllAnnotators } from '@/app/actions/annotator';
import {
  changeAnnotator,
  deleteTask,
  getPaginatedTasks,
} from '@/app/actions/task';
import { upsertTemplate } from '@/app/actions/template';
import { template } from '@/app/template/page';
import { SheetMenu } from '@/components/admin-panel/sheet-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Filter } from 'lucide-react';
import Loader from '@/components/ui/NewLoader/Loader';
import { DataLoadingSpinner } from '@/components/ui/DataLoadingSpinner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import useJobList from '@/hooks/use-jobList';
import { useToast } from '@/hooks/use-toast';
import { Bot, FileDown, Mail, PlusCircle, Shuffle } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { TaskTable } from './table';
import TaskProgress from './TaskProgress';
import { format, parseISO } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TrainFrontTunnel } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { MailDialogComponent } from './mail-dialog';
import {
  Command,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import { Search } from 'lucide-react';
import ReviewerDialogComponent from './reviewer-dialog';
import AnnotatorDialog from './annotator-dialog';
import { getProviderAIModels } from '@/app/actions/providerAIModel';

// --- KEEP ORIGINAL INTERFACES ---
export interface Task {
  _id: string;
  name: string;
  project: string;
  content: string;
  created_at: string;
  status: string;
  submitted: boolean;
  annotator?: string;
  assignedAt: string;
  reviewer?: string;
  timeTaken: number;
  feedback: string;
  ai: string;
}

export interface Annotator {
  _id: string;
  name: string;
  email: string;
  role: string | null;
  lastLogin: string;
  permission?: string[];
}

// KEEP the Judge interface - just change how we populate it
export interface Judge {
  _id: string;
  user: string;
  projectid: string;
  name: string;
  model: string;
  provider: string;
  enabled: boolean;
  apiKey: string;
  systemPrompt?: string;
  created_at: string;
}

type taskType = 'core' | 'training' | 'test';

export default function Component() {
  // --- KEEP ORIGINAL STATE VARIABLES ---
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [inactiveTimeSort, setInactiveTimeSort] = useState<'asc' | 'desc' | ''>(
    ''
  );
  const [isMailDialogOpen, setIsMailDialogOpen] = useState(false);
  const [annotators, setAnnotators] = useState<Annotator[]>([]);
  const [judges, setJudges] = useState<Judge[]>([]); // KEEP judges state
  const [activeTab, setActiveTab] = useState('all');
  const [allReviewers, setAllReviewers] = useState<Annotator[]>([]);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<Annotator[]>([]);
  const { removeJobByTaskid, setJob } = useJobList();
  const pathName = usePathname();
  const projectId = pathName.split('/')[3];
  const router = useRouter();
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [taskType, setTaskType] = useState<taskType>('test');
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [expertFilter, setExpertFilter] = useState('');
  const [reviewerFilter, setReviewerFilter] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [expertSearch, setExpertSearch] = useState('');
  const [reviewerSearch, setReviewerSearch] = useState('');
  const [isAnnotatorDialogOpen, setIsAnnotatorDialogOpen] = useState(false);
  const [isReviewerDialogOpen, setIsReviewerDialogOpen] = useState(false);
  const { toast } = useToast();
  const [selectedTask, setSelectedTask] = useState<Task[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // UPDATED fetchJudges to use getProviderAIModels
  const fetchJudges = async () => {
    try {
      console.log('Fetching AI models for user (as judges)');

      const response = await getProviderAIModels();
      console.log('ProviderAI models response:', response);

      if (!response.success) {
        console.error('Failed to fetch AI models:', response.error);
        toast({
          variant: 'destructive',
          title: 'Fetching AI models failed',
          description: response.error || 'An unexpected error occurred',
        });
        setJudges([]);
        return;
      }

      if (response.models && Array.isArray(response.models)) {
        console.log(`Found ${response.models.length} AI models`);

        // Transform ProviderAIModel to Judge interface
        const transformedJudges = response.models.map((model) => ({
          _id: model.id,
          user: model.id, // ProviderAIModel doesn't have user field, using id
          projectid: projectId, // Current project
          name: model.name,
          model: model.model,
          provider: model.provider,
          enabled: true, // All ProviderAIModels are considered enabled
          apiKey: model.apiKey,
          systemPrompt: model.systemPrompt || '',
          created_at: model.createdAt.toISOString(),
        }));

        setJudges(transformedJudges);
        console.log(
          `Transformed ${transformedJudges.length} AI models to judges`
        );
      } else {
        console.log('No AI models found');
        setJudges([]);
      }
    } catch (error: any) {
      console.error('Error fetching AI models:', error);
      toast({
        variant: 'destructive',
        title: 'Fetching AI models failed',
        description: error.message || 'An unexpected error occurred',
      });
      setJudges([]);
    }
  };

  // --- KEEP ORIGINAL filter count effect ---
  useEffect(() => {
    const count = [
      statusFilter,
      expertFilter,
      reviewerFilter,
      inactiveTimeSort,
    ].filter((filter) => filter !== '').length;
    setActiveFiltersCount(count);
  }, [statusFilter, expertFilter, reviewerFilter, inactiveTimeSort]);

  // --- KEEP ORIGINAL main data fetching effect ---
  useEffect(() => {
    let isMounted = true;
    async function init() {
      if (!projectId) return;
      setIsDataLoading(true);
      try {
        await fetchTask(projectId, currentPage);
        await fetchJudges(); // Now uses getProviderAIModels
      } catch (error) {
        console.error('Error during initial data fetch:', error);
      } finally {
        if (isMounted) {
          setIsDataLoading(false);
        }
      }
    }
    if (session && projectId) {
      init();
    } else {
      if (isMounted) setIsDataLoading(false);
    }
    return () => {
      isMounted = false;
    };
  }, [projectId, session, activeTab, taskType, pageSize, currentPage]);

  // --- KEEP ORIGINAL Session Check ---
  if (!session) {
    return <Loader />;
  }

  // --- KEEP ORIGINAL Role Check ---
  if (session?.user?.role === 'annotator') {
    router.push('/tasks');
    return <Loader />;
  }

  // --- KEEP ORIGINAL Data Loading Check ---
  if (isDataLoading) {
    return <Loader />;
  }

  // --- KEEP ORIGINAL fetchTask function ---
  async function fetchTask(projectId: string, page: number) {
    if (!session?.user) return;

    try {
      const paginatedResponseStr = await getPaginatedTasks(
        projectId,
        page,
        activeTab,
        taskType,
        pageSize
      );
      const annotatorsDataStr = await getAllAnnotators();

      const paginatedResponse = JSON.parse(paginatedResponseStr);
      const annotatorsData = JSON.parse(annotatorsDataStr) as Annotator[];

      if (!paginatedResponse || typeof paginatedResponse !== 'object')
        throw new Error('Invalid task response');
      if (!Array.isArray(annotatorsData))
        throw new Error('Invalid annotator data');

      const projectManager: Annotator = {
        _id: session.user.id,
        name: session.user.name || 'Project Manager',
        email: session.user.email || '',
        lastLogin: new Date().toISOString(),
        role: session.user.role || 'Project Manager',
      };

      const tasksList =
        paginatedResponse.tasks && Array.isArray(paginatedResponse.tasks)
          ? paginatedResponse.tasks
          : [];

      setCurrentPage(paginatedResponse.page ?? 1);
      setTotalPages(paginatedResponse.pages ?? 0);
      setTotalItems(paginatedResponse.total ?? 0);
      setTasks(
        tasksList.map((task: Task) => ({
          ...task,
          reviewer: task.reviewer || projectManager._id,
        }))
      );
      setAnnotators([projectManager, ...annotatorsData]);
      setAllReviewers([projectManager, ...annotatorsData]);
    } catch (error: any) {
      console.error('Failed to fetch tasks:', error);
      toast({
        variant: 'destructive',
        title: 'Error Loading Tasks',
        description: error.message,
      });
      setTasks([]);
      setAnnotators([]);
      setAllReviewers([]);
      setCurrentPage(1);
      setTotalPages(0);
      setTotalItems(0);
    }
  }

  // --- KEEP ALL OTHER ORIGINAL FUNCTIONS ---
  async function handlePageChange(newPage: number) {
    setCurrentPage(newPage);
  }

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  async function handleAssignUser(
    annotatorId: string,
    taskId: string,
    ai: boolean,
    isReviewer: boolean = false
  ) {
    try {
      const res = JSON.parse(
        await changeAnnotator(taskId, annotatorId, ai, isReviewer)
      );
      if (res && res._id) {
        setTasks((currentTasks) =>
          currentTasks.map((task) => {
            if (task._id === taskId) {
              return isReviewer
                ? { ...task, reviewer: annotatorId }
                : { ...task, ...res };
            }
            return task;
          })
        );
      } else {
        console.error('Invalid response from changeAnnotator:', res);
        toast({
          variant: 'destructive',
          title: 'Assignment Error',
          description: 'Received invalid data after assignment.',
        });
      }
    } catch (error: any) {
      console.error('Error assigning user:', error);
      toast({
        variant: 'destructive',
        title: 'Assignment Failed',
        description: error.message,
      });
    }
  }

  const handleSendEmail = async (selectedAnnotators: Annotator[]) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/sendNotificationEmail/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedAnnotators: selectedAnnotators.map(
            (annotator) => annotator._id
          ),
          projectId: projectId,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setIsMailDialogOpen(false);
        toast({
          title: 'Email sent successfully',
          description: result.msg,
          variant: 'default',
        });
      } else {
        toast({
          title: `Error: ${result.msg || 'Configure custom template in notifications'}`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Email sending error:', error);
      toast({
        title: 'An unexpected error occurred. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) {
      toast({ title: 'Template name cannot be empty', variant: 'destructive' });
      return;
    }
    const defaultTemplate = {
      name: newTemplateName.trim(),
      project: projectId,
    };
    const createdTemplate: template & { _id?: string } = JSON.parse(
      await upsertTemplate(
        projectId as string,
        defaultTemplate as template,
        undefined,
        true
      )
    );
    if (createdTemplate?._id) {
      router.push(`/template?Id=${createdTemplate._id}`);
    } else {
      toast({ title: 'Failed to create template', variant: 'destructive' });
    }
  };

  const filteredReviewers = allReviewers.filter(
    (reviewer) =>
      (reviewer.permission && reviewer.permission.includes('canReview')) ||
      (session?.user && reviewer._id === session.user.id)
  );

  const handleDeleteTemplate = async (e: React.MouseEvent, _id: string) => {
    e.stopPropagation();
    try {
      await deleteTask(_id);
      removeJobByTaskid(_id);
      setTasks(tasks.filter((project) => project._id !== _id));
      toast({ title: 'Task deleted' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: error.message,
      });
    }
  };

  // --- KEEP ORIGINAL handleAssignAI ---
  async function handleAssignAI() {
    const unassignedTasks = tasks.filter(
      (task) => !task.annotator && !task.ai && !task.submitted
    );

    if (unassignedTasks.length === 0) {
      toast({
        variant: 'destructive',
        title: 'AI assignment failed',
        description: 'No unassigned tasks found.',
      });
      return;
    }
    if (judges.length === 0) {
      toast({
        title: 'No AI Models Available',
        variant: 'destructive',
        description: 'Please configure AI models first.',
      });
      return;
    }

    let judgeIndex = 0;
    const updatedTasks: Task[] = [...tasks];
    let assignedCount = 0;
    setIsLoading(true);

    for (const task of unassignedTasks) {
      const currentJudge = judges[judgeIndex % judges.length];
      if (!currentJudge?._id) {
        toast({
          variant: 'destructive',
          title: 'Fetching judges',
          description: 'Please wait...',
        });
        setIsLoading(false);
        return;
      }

      try {
        const res = await addJob(currentJudge._id, task._id, projectId);
        if (res.error) {
          toast({
            variant: 'destructive',
            title: 'AI assignment failed',
            description: res.error,
          });
          continue;
        } else {
          setJob(JSON.parse(res.model as string));
          await handleAssignUser(currentJudge._id, task._id, true);
          const taskIndex = updatedTasks.findIndex((t) => t._id === task._id);
          if (taskIndex !== -1) {
            updatedTasks[taskIndex] = {
              ...updatedTasks[taskIndex],
              ai: currentJudge._id,
            };
          }
          assignedCount++;
        }
      } catch (jobError: any) {
        toast({
          variant: 'destructive',
          title: `Error assigning AI to ${task.name}`,
          description: jobError.message,
        });
      }
      judgeIndex++;
    }

    setTasks(updatedTasks);
    setIsLoading(false);

    if (assignedCount > 0) {
      toast({
        title: 'AI assigned',
        description: `${assignedCount} tasks have been assigned to AI. Please refresh the page to see the changes.`,
      });
    }
  }

  // --- KEEP ORIGINAL handleExport ---
  const handleExport = (exportFormat: string) => {
    const dataToExport = tasks.map((task) => ({
      name: task.name,
      project: task.project,
      status: task.status,
      submitted: task.submitted ? 'Yes' : 'No',
      annotator:
        annotators.find((a) => a._id === task.annotator)?.name || 'Unassigned',
      annotatorEmailAddress:
        annotators.find((a) => a._id === task.annotator)?.email || 'Unassigned',
      reviewer:
        annotators.find((a) => a._id === task.reviewer)?.name || 'Unassigned',
      reviewerEmailAddress:
        annotators.find((a) => a._id === task.reviewer)?.email || 'Unassigned',
      ai: task.ai
        ? (judges.find((j) => j._id === task.ai)?.name ?? 'Not Assigned')
        : 'Not Assigned',
      created_at: task.created_at
        ? format(parseISO(task.created_at), 'PPPpp')
        : 'N/A',
      timeTaken: `${task.timeTaken || 0} minutes`,
      feedback: task.feedback || 'No feedback',
    }));

    if (dataToExport.length === 0) {
      toast({ title: 'No tasks to export', variant: 'default' });
      setIsExportDialogOpen(false);
      return;
    }

    if (exportFormat === 'json') {
      const dataStr = JSON.stringify(dataToExport, null, 2);
      const dataUri =
        'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      const exportFileDefaultName = `tasks_${activeTab}.json`;
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      linkElement.remove();
    } else {
      const headers = [
        'name',
        'project',
        'status',
        'submitted',
        'annotator',
        'annotatorEmailAddress',
        'reviewer',
        'reviewerEmailAddress',
        'ai',
        'created_at',
        'timeTaken',
        'feedback',
      ];
      const csvContent = [
        headers.join(','),
        ...dataToExport.map((row: any) =>
          headers
            .map(
              (header) =>
                `"${String(row[header as keyof typeof row] ?? '').replace(/"/g, '""')}"`
            )
            .join(',')
        ),
      ].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `tasks_${activeTab}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    }
    setIsExportDialogOpen(false);
  };

  // --- KEEP ORIGINAL filteredTasks calculation ---
  const filteredTasks = tasks
    .filter((task) => {
      const matchesStatus =
        statusFilter !== 'all'
          ? statusFilter === 'assigned'
            ? task.annotator !== null &&
              task.annotator !== undefined &&
              task.annotator !== ''
            : statusFilter
              ? task.status?.toLowerCase() === statusFilter.toLowerCase()
              : true
          : true;
      const matchesExpert = expertFilter
        ? task.annotator === expertFilter
        : true;
      const matchesReviewer =
        reviewerFilter && reviewerFilter !== 'all'
          ? task.reviewer === reviewerFilter
          : true;
      return matchesStatus && matchesExpert && matchesReviewer;
    })
    .sort((a, b) => {
      if (inactiveTimeSort && a.assignedAt && b.assignedAt) {
        try {
          const inactiveA = Date.now() - new Date(a.assignedAt).getTime();
          const inactiveB = Date.now() - new Date(b.assignedAt).getTime();
          if (inactiveTimeSort === 'asc') return inactiveA - inactiveB;
          if (inactiveTimeSort === 'desc') return inactiveB - inactiveA;
        } catch (dateError) {
          console.error(
            'Error parsing assignedAt date for sorting:',
            dateError
          );
          return 0;
        }
      }
      try {
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      } catch (dateError) {
        console.error('Error parsing created_at date for sorting:', dateError);
        return 0;
      }
    });

  // --- KEEP ORIGINAL RETURN JSX ---
  return (
    <div className='min-h-screen'>
      <header className='bg-white'>
        <div className='max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center'>
          <h1 className='text-3xl font-bold text-gray-900 tracking-tight'>
            Tasks
          </h1>
          <div className='flex gap-4 items-center'>
            <Select
              value={taskType}
              onValueChange={(value: taskType) => setTaskType(value)}
            >
              <SelectTrigger className='w-32'>
                <SelectValue placeholder='Core' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='core'>Core</SelectItem>
                <SelectItem value='training'>Training</SelectItem>
                <SelectItem value='test'>Test</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={'outline'}
              size='sm'
              onClick={() => {
                setIsMailDialogOpen(true);
              }}
              disabled={isLoading}
            >
              <Mail className='h-4 w-4 mr-2' />
              Send Custom Mail
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setIsExportDialogOpen(true)}
              disabled={isLoading || tasks.length === 0}
            >
              <FileDown className='h-4 w-4 mr-2' />
              Export
            </Button>
            <SheetMenu />
          </div>
        </div>
      </header>
      <main className='max-w-7xl mx-auto sm:px-6 lg:px-8'>
        <form onSubmit={handleCreateTemplate} className='mb-8'>
          <div className='flex gap-4'>
            <Input
              type='text'
              required
              placeholder='New Template name'
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              className='flex-grow'
            />
            <Button type='submit' disabled={isLoading}>
              <PlusCircle className='mr-2 h-4 w-4' /> Create Template
            </Button>
          </div>
        </form>

        <>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className='flex flex-col gap-4 mb-4 md:flex-row md:items-center md:justify-between'>
              <TabsList>
                <TabsTrigger value='all'>All Tasks</TabsTrigger>
                <TabsTrigger value='submitted'>Submitted Tasks</TabsTrigger>
                <TabsTrigger value='unassigned'>Unassigned Tasks</TabsTrigger>
              </TabsList>
              <div className='flex gap-2'>
                <Popover>
                  <PopoverTrigger className='flex items-center justify-center px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200'>
                    <Filter className='h-5 w-5' />
                    {activeFiltersCount > 0 && (
                      <span className='ml-1 text-xs text-red-500'>
                        {activeFiltersCount}
                      </span>
                    )}
                  </PopoverTrigger>
                  <PopoverContent className='p-4 bg-white border rounded-md shadow-lg w-[300px]'>
                    <div className='flex flex-col gap-4'>
                      <Select
                        value={statusFilter || 'all'}
                        onValueChange={(v) =>
                          setStatusFilter(v === 'all' ? '' : v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue>
                            {statusFilter === ''
                              ? 'Filter Status'
                              : statusFilter}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='all'>All</SelectItem>
                          <SelectItem value='assigned'>Assigned</SelectItem>
                          <SelectItem value='reassigned'>Reassigned</SelectItem>
                          <SelectItem value='pending'>Pending</SelectItem>
                          <SelectItem value='rejected'>Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        value={expertFilter || 'all'}
                        onValueChange={(v) =>
                          setExpertFilter(v === 'all' ? '' : v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue>
                            {expertFilter
                              ? annotators.find((a) => a._id === expertFilter)
                                  ?.name || 'Select Expert'
                              : 'Filter Expert'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <Command shouldFilter={false}>
                            <CommandInput
                              placeholder='Search experts...'
                              value={expertSearch}
                              onValueChange={setExpertSearch}
                              className='border-none outline-none focus:ring-0'
                            />
                            <CommandList>
                              <CommandGroup>
                                <CommandItem
                                  onSelect={() => {
                                    setExpertFilter('');
                                    setExpertSearch('');
                                  }}
                                >
                                  <span>All Experts</span>
                                </CommandItem>
                                {annotators
                                  .filter(
                                    (a) =>
                                      a.name
                                        .toLowerCase()
                                        .includes(expertSearch.toLowerCase()) ||
                                      expertSearch === ''
                                  )
                                  .map((annotator) => (
                                    <CommandItem
                                      key={annotator._id}
                                      onSelect={() => {
                                        setExpertFilter(annotator._id);
                                        setExpertSearch('');
                                      }}
                                    >
                                      <span>{annotator.name}</span>
                                    </CommandItem>
                                  ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </SelectContent>
                      </Select>
                      <Select
                        value={reviewerFilter || 'all'}
                        onValueChange={(v) =>
                          setReviewerFilter(v === 'all' ? '' : v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue>
                            {reviewerFilter
                              ? filteredReviewers.find(
                                  (r) => r._id === reviewerFilter
                                )?.name || 'Select Reviewer'
                              : 'Filter Reviewer'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <Command shouldFilter={false}>
                            <CommandInput
                              placeholder='Search reviewers...'
                              value={reviewerSearch}
                              onValueChange={setReviewerSearch}
                              className='border-none outline-none focus:ring-0'
                            />
                            <CommandList>
                              <CommandGroup>
                                <CommandItem
                                  onSelect={() => {
                                    setReviewerFilter('');
                                    setReviewerSearch('');
                                  }}
                                >
                                  <span>All Reviewers</span>
                                </CommandItem>
                                {filteredReviewers
                                  .filter(
                                    (r) =>
                                      r.name
                                        .toLowerCase()
                                        .includes(
                                          reviewerSearch.toLowerCase()
                                        ) || reviewerSearch === ''
                                  )
                                  .map((reviewer) => (
                                    <CommandItem
                                      key={reviewer._id}
                                      onSelect={() => {
                                        setReviewerFilter(reviewer._id);
                                        setReviewerSearch('');
                                      }}
                                    >
                                      <span>{reviewer.name}</span>
                                    </CommandItem>
                                  ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </SelectContent>
                      </Select>
                      <Select
                        value={inactiveTimeSort || 'none'}
                        onValueChange={(v) =>
                          setInactiveTimeSort(
                            v === 'none' ? '' : (v as '' | 'asc' | 'desc')
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue>
                            {inactiveTimeSort === ''
                              ? 'Sort by Inactive Time'
                              : inactiveTimeSort === 'asc'
                                ? 'Inactive Time Asc'
                                : 'Inactive Time Desc'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='none'>None</SelectItem>
                          <SelectItem value='asc'>Inactive Time Asc</SelectItem>
                          <SelectItem value='desc'>
                            Inactive Time Desc
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <div className='flex flex-wrap gap-2 items-center'>
                <TaskProgress setTasks={setTasks} />
                <div className='flex gap-2'>
                  <Button
                    onClick={() => setIsAnnotatorDialogOpen(true)}
                    variant='outline'
                    size='sm'
                    disabled={isLoading}
                  >
                    <Shuffle className='mr-2 h-4 w-4' /> Auto-assign Annotators
                    ({selectedTask.length > 0 ? selectedTask.length : 'All'})
                  </Button>
                  <Button
                    onClick={() => {
                      setIsReviewerDialogOpen(true);
                    }}
                    variant='outline'
                    size='sm'
                    disabled={isLoading}
                  >
                    <Shuffle className='mr-2 h-4 w-4' /> Auto-assign Reviewers (
                    {selectedTask.length > 0 ? selectedTask.length : 'All'})
                  </Button>
                </div>
              </div>
            </div>

            {/* --- Tabs Content --- */}
            <TabsContent value='all'>
              <TaskTable
                selectedTask={selectedTask}
                setSelectedTask={setSelectedTask}
                onPageChange={handlePageChange}
                currentPage={currentPage}
                totalPages={totalPages}
                setTasks={setTasks}
                tasks={filteredTasks}
                annotators={annotators}
                reviewers={filteredReviewers}
                judges={judges}
                handleAssignUser={handleAssignUser}
                handleDeleteTemplate={handleDeleteTemplate}
                router={router}
                session={session}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
                activeTab='all'
                taskType={taskType}
                statusFilter={statusFilter}
                expertFilter={expertFilter}
                reviewerFilter={reviewerFilter}
                inactiveTimeSort={inactiveTimeSort}
              />
            </TabsContent>
            <TabsContent value='submitted'>
              <TaskTable
                selectedTask={selectedTask}
                setSelectedTask={setSelectedTask}
                currentPage={currentPage}
                onPageChange={handlePageChange}
                totalPages={totalPages}
                setTasks={setTasks}
                tasks={filteredTasks}
                annotators={annotators}
                reviewers={filteredReviewers}
                judges={judges}
                handleAssignUser={handleAssignUser}
                handleDeleteTemplate={handleDeleteTemplate}
                router={router}
                session={session}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
                totalItems={totalItems}
                activeTab='submitted'
                taskType={taskType}
                statusFilter={statusFilter}
                expertFilter={expertFilter}
                reviewerFilter={reviewerFilter}
                inactiveTimeSort={inactiveTimeSort}
              />
            </TabsContent>
            <TabsContent value='unassigned'>
              <TaskTable
                selectedTask={selectedTask}
                setSelectedTask={setSelectedTask}
                onPageChange={handlePageChange}
                currentPage={currentPage}
                totalPages={totalPages}
                setTasks={setTasks}
                tasks={filteredTasks}
                annotators={annotators}
                reviewers={filteredReviewers}
                judges={judges}
                handleAssignUser={handleAssignUser}
                handleDeleteTemplate={handleDeleteTemplate}
                router={router}
                session={session}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
                totalItems={totalItems}
                activeTab='unassigned'
                taskType={taskType}
                statusFilter={statusFilter}
                expertFilter={expertFilter}
                reviewerFilter={reviewerFilter}
                inactiveTimeSort={inactiveTimeSort}
              />
            </TabsContent>
          </Tabs>
        </>
      </main>

      {/* --- Dialogs --- */}
      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Tasks</DialogTitle>
            <DialogDescription>
              Choose your preferred export format for {activeTab} tasks
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => handleExport('csv')}>
              Export as CSV
            </Button>
            <Button onClick={() => handleExport('json')}>Export as JSON</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div>
        <ReviewerDialogComponent
          isOpen={isReviewerDialogOpen}
          onClose={() => setIsReviewerDialogOpen(false)}
          reviewers={filteredReviewers}
          tasks={tasks}
          setTasks={setTasks}
          selectedTasks={selectedTask}
        />
        <AnnotatorDialog
          isOpen={isAnnotatorDialogOpen}
          onClose={() => setIsAnnotatorDialogOpen(false)}
          selectedTasks={selectedTask}
          annotators={annotators}
          reviewers={filteredReviewers}
          setTasks={setTasks}
          tasks={tasks}
        />
        <MailDialogComponent
          isMailDialogOpen={isMailDialogOpen}
          setIsMailDialogOpen={setIsMailDialogOpen}
          selectedMembers={selectedMembers}
          setSelectedMembers={setSelectedMembers}
          handleSendEmail={handleSendEmail}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
