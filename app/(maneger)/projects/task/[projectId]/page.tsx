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
import { Filter, Loader2 } from 'lucide-react';
import Loader from '@/components/ui/Loader/Loader';
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
import { Judge } from '../../ai-config/[projectId]/page';
import { TaskTable } from './table';
import TaskProgress from './TaskProgress';
import { format, parseISO } from 'date-fns';
import Task from '@/models/Task';
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
  reviewer?: string; // Added reviewer field
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

type taskType = 'core' | 'training' | 'test';

export default function Component() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [inactiveTimeSort, setInactiveTimeSort] = useState<'asc' | 'desc' | ''>(
    ''
  );
  const [isMailDialogOpen, setIsMailDialogOpen] = useState(false);
  const [annotators, setAnnotators] = useState<Annotator[]>([]);
  const [judges, setJudges] = useState<Judge[]>([]);
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
  const [isReviewerDialogOpen,setIsReviewerDialogOpen]=useState(false);
  const { toast } = useToast();
  const [selectedTask, setSelectedTask] = useState<Task[]>([]);
  const fetchJudges = async () => {
    const res = await fetch(`/api/aiModel?projectId=${projectId}`);
    const judges = await res.json();
    if (judges.error) {
      toast({
        variant: 'destructive',
        title: 'Fetching judges failed',
        description: judges.error,
      });
      return;
    }
    setJudges(judges.models.filter((judge: Judge) => judge.enabled == true));
  };

  useEffect(() => {
    const count = [
      statusFilter,
      expertFilter,
      reviewerFilter,
      inactiveTimeSort,
    ].filter((filter) => filter !== '').length;
    setActiveFiltersCount(count);
  }, [statusFilter, expertFilter, reviewerFilter, inactiveTimeSort]);

  useEffect(() => {
    async function init() {
      fetchTask(projectId, 1);
      fetchJudges();
    }
    if (session) {
      init();
    }
  }, [projectId, session, activeTab, taskType, pageSize]);
  if (!session) {
    return <Loader />;
  }

  if (session?.user?.role === 'annotator') router.push('/tasks');

  async function fetchTask(projectId: string, page: number) {
    if (!session?.user) return;

    const paginatedResponse = JSON.parse(
      await getPaginatedTasks(projectId, page, activeTab, taskType, pageSize)
    );
    const projectManager: Annotator = {
      _id: session.user.id,
      name: session.user.name || 'Project Manager',
      email: session.user.email || '',
      lastLogin: new Date().toISOString(),
      role: session.user.role || 'Project Manager',
    };
    const annotatorsData = JSON.parse(await getAllAnnotators()) as Annotator[];
    const tasks = paginatedResponse.tasks as Task[];
    setCurrentPage(paginatedResponse.page);
    setTotalPages(paginatedResponse.pages);
    setTotalItems(paginatedResponse.total);
    setTasks(
      paginatedResponse.tasks.map((task: Task) => ({
        ...task,
        reviewer: task.reviewer || projectManager._id, // Set project manager as default reviewer
      }))
    );

    setAnnotators([projectManager, ...annotatorsData]);
    setAllReviewers([projectManager, ...annotatorsData]);
  }
  async function handlePageChange(newPage: number) {
    fetchTask(projectId, newPage);
    setCurrentPage(newPage);
  }
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1); // Reset to first page when changing page size
    fetchTask(projectId, 1); // Refetch with new page size
  };
  async function handleAssignUser(
    annotatorId: string,
    taskId: string,
    ai: boolean,
    isReviewer: boolean = false
  ) {
    // Assuming you'll need to modify the changeAnnotator action to handle reviewer assignment
    const res = JSON.parse(
      await changeAnnotator(taskId, annotatorId, ai, isReviewer)
    );
    setTasks(
      tasks.map((task) => {
        if (task._id === taskId) {
          return isReviewer ? { ...res, reviewer: annotatorId } : res;
        }
        return task;
      })
    );
  }

  const handleSendEmail = async (selectedAnnotators: Annotator[]) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/sendNotificationEmail/custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedAnnotators: selectedAnnotators.map(
            (annotator) => annotator._id
          ),
          projectId: projectId,
        }),
      });

      // Handling the response
      if (response.ok) {
        setIsMailDialogOpen(false);
        toast({
          title: 'Email sent successfully',
          variant: 'default',
        });
      } else {
        // Error from server
        const errorData = await response.json();
        toast({
          title: `Error: ${errorData.message || 'Configure custom template in notifications'}`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      // Network or unexpected error
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
    const defaultTemplate = {
      name: newTemplateName.trim(),
      project: projectId,
    };
    const template: template = JSON.parse(
      await upsertTemplate(
        projectId as string,
        defaultTemplate as template,
        undefined,
        true
      )
    );
    router.push(`/template?Id=${template._id}`);
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
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: error.message,
      });
    }
  };

  const handleBulkAssignReviewers = async () => {
    if (allReviewers.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Bulk reviewer assignment failed',
        description: 'No reviewers available.',
      });
      return;
    }

    const tasksNeedingReviewer =
      selectedTask.length === 0
        ? tasks.filter((task) => !task.reviewer)
        : selectedTask.filter((task) => !task.reviewer);

    const updatedTasks = [...tasks];

    for (let i = 0; i < tasksNeedingReviewer.length; i++) {
      const task = tasksNeedingReviewer[i];
      const reviewerIndex = (i % (allReviewers.length - 1)) + 1;
      const reviewerId = allReviewers[reviewerIndex]._id;

      if (reviewerId === task.annotator) {
        await changeAnnotator(task._id, allReviewers[0]._id, false, true);
        const taskIndex = updatedTasks.findIndex((t) => t._id === task._id);
        updatedTasks[taskIndex] = {
          ...task,
          reviewer: allReviewers[0]._id,
        };
      } else {
        await changeAnnotator(task._id, reviewerId, false, true);
        const taskIndex = updatedTasks.findIndex((t) => t._id === task._id);
        updatedTasks[taskIndex] = {
          ...task,
          reviewer: reviewerId,
        };
      }
    }

    setTasks(updatedTasks);
    toast({
      title: 'Bulk reviewer assignment completed',
      description: `${tasksNeedingReviewer.length} tasks have been assigned reviewers.`,
    });
  };

  const handleAutoAssign = async () => {
    if (annotators.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Auto-assign failed',
        description: 'There are no annotators available.',
      });
      return;
    }

    const tasksToAssign =
      selectedTask.length > 0
        ? selectedTask
        : tasks.filter((task) => !task.annotator);

    const updatedTasks = [...tasks];

    for (let i = 0; i < tasksToAssign.length; i++) {
      const task = tasksToAssign[i];
      const annotatorIndex = i % annotators.length;
      const annotatorId = annotators[annotatorIndex]._id;

      const availableReviewers = allReviewers.filter(
        (r) => r._id !== annotatorId
      );
      const reviewerId =
        availableReviewers.length > 1
          ? availableReviewers[1]._id
          : allReviewers[0]._id;

      await changeAnnotator(task._id, annotatorId, false, false);
      await changeAnnotator(task._id, reviewerId, false, true);

      const taskIndex = updatedTasks.findIndex((t) => t._id === task._id);
      updatedTasks[taskIndex] = {
        ...task,
        annotator: annotatorId,
        reviewer: reviewerId,
      };
    }

    setTasks(updatedTasks);
    toast({
      title: 'Auto-assign completed',
      description: `${tasksToAssign.length} tasks have been assigned with annotators and reviewers.`,
    });
  };

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
    var judgeIndex = 0;
    const updatedTasks: Task[] = [...tasks];
    for (const task of unassignedTasks) {
      if (!judges[judgeIndex]._id) {
        toast({
          variant: 'destructive',
          title: 'Fetching judges',
          description: 'Please wait...',
        });
        return;
      }
      const res = await addJob(judges[judgeIndex]._id, task._id, projectId);
      if (res.error) {
        toast({
          variant: 'destructive',
          title: 'AI assignment failed',
          description: res.error,
        });
        return;
      }
      setJob(JSON.parse(res.model as string));
      await handleAssignUser(judges[judgeIndex]._id, task._id, true);
      const taskIndex = updatedTasks.findIndex((t) => t._id === task._id);
      updatedTasks[taskIndex] = { ...task, ai: judges[judgeIndex]._id };
      judgeIndex = (judgeIndex + 1) % judges.length;
    }
    setTasks(updatedTasks);
    toast({
      title: 'AI assigned',
      description: `${unassignedTasks.length} tasks have been assigned to AI.
                    Please refresh the page to see the changes.`,
    });
  }

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
        ? judges.find((j) => j._id === task.ai)?.name
        : 'Not Assigned',
      created_at: format(parseISO(task.created_at), 'PPPpp'),
      timeTaken: `${task.timeTaken || 0} minutes`,
      feedback: task.feedback || 'No feedback',
    }));

    if (exportFormat === 'json') {
      const dataStr = JSON.stringify(dataToExport, null, 2);
      const dataUri =
        'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      const exportFileDefaultName = `tasks_${activeTab}.json`;
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
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
        ...dataToExport.map((row) =>
          headers
            .map((header) => `"${row[header as keyof typeof row]}"`)
            .join(',')
        ),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `tasks_${activeTab}.csv`);
      link.click();
    }

    setIsExportDialogOpen(false);
  };
  const filteredTasks = tasks
    .sort((a: Task, b: Task) => {
      // Calculate inactive time for both tasks
      const inactiveA = Date.now() - new Date(a.assignedAt).getTime();
      const inactiveB = Date.now() - new Date(b.assignedAt).getTime();

      // Sort by inactive time based on the inactiveTimeSort state
      if (inactiveTimeSort === 'asc') {
        return inactiveA - inactiveB; // Ascending
      } else if (inactiveTimeSort === 'desc') {
        return inactiveB - inactiveA; // Descending
      }
      return 0; // No sorting if no inactive time filter is set
    })
    .filter((task) => {
      // Apply Status Filter
      const matchesStatus =
        statusFilter !== 'all'
          ? statusFilter === 'assigned'
            ? task.annotator !== null &&
              task.annotator !== undefined &&
              task.annotator !== ''
            : statusFilter
              ? task.status.toLowerCase() === statusFilter.toLowerCase()
              : true
          : true;

      // Apply Expert Filter
      const matchesExpert = expertFilter
        ? task.annotator === expertFilter
        : true;

      // Apply Reviewer Filter
      const matchesReviewer =
        reviewerFilter && reviewerFilter !== 'all'
          ? task.reviewer === reviewerFilter
          : true;

      return matchesStatus && matchesExpert && matchesReviewer;
    });

  return (
    <div className='min-h-screen'>
      <header className='bg-white'>
        <div className='max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center'>
          <h1 className='text-3xl font-bold text-gray-900 tracking-tight'>
            Tasks
          </h1>
          <div className='flex gap-4 items-center'>
            {/* Select Dropdown for Task Type */}
            <Select onValueChange={(value: taskType) => setTaskType(value)}>
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
            >
              <Mail className='h-4 w-4 mr-2' />
              Send Custom Mail
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setIsExportDialogOpen(true)}
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
            <Button type='submit'>
              <PlusCircle className='mr-2 h-4 w-4' /> Create Template
            </Button>
          </div>
        </form>

        <>
          <Tabs
            value={activeTab}
            onValueChange={(value: string) => setActiveTab(value)}
          >
            <div className='flex flex-col gap-4 mb-4 md:flex-row md:items-center md:justify-between'>
              <TabsList>
                <TabsTrigger value='all'>All Tasks</TabsTrigger>
                <TabsTrigger value='submitted'>Submitted Tasks</TabsTrigger>
                <TabsTrigger value='unassigned'>Unassigned Tasks</TabsTrigger>
              </TabsList>

              {/* Left-aligned Filter Icon with applied filters count */}
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

                  {/* Popover Content with filter options */}
                  <PopoverContent className='p-4 bg-white border rounded-md shadow-lg w-[300px]'>
                    <div className='flex flex-col gap-4'>
                      {/* Status Filter */}
                      <Select
                        value={statusFilter || 'all'}
                        onValueChange={(value) =>
                          setStatusFilter(value === 'all' ? '' : value)
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

                      {/* // Expert Filter */}
                      <Select
                        value={expertFilter || 'all'}
                        onValueChange={(value) =>
                          setExpertFilter(value === 'all' ? '' : value)
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
                            {' '}
                            {/* Important: disable default filtering */}
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
                                    (annotator) =>
                                      annotator.name
                                        .toLowerCase()
                                        .includes(expertSearch.toLowerCase()) ||
                                      expertSearch === '' // Show all when search is empty
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

                      {/* // Reviewer Filter */}
                      <Select
                        value={reviewerFilter || 'all'}
                        onValueChange={(value) =>
                          setReviewerFilter(value === 'all' ? '' : value)
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
                            {' '}
                            {/* Important: disable default filtering */}
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
                                    (reviewer) =>
                                      reviewer.name
                                        .toLowerCase()
                                        .includes(
                                          reviewerSearch.toLowerCase()
                                        ) || reviewerSearch === '' // Show all when search is empty
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
                        onValueChange={(value) =>
                          setInactiveTimeSort(
                            value === 'none'
                              ? ''
                              : (value as '' | 'asc' | 'desc')
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
                    onClick={handleAutoAssign}
                    variant='outline'
                    size='sm'
                  >
                    <Shuffle className='mr-2 h-4 w-4' /> Auto-assign Annotators(
                    {selectedTask.length > 0 ? selectedTask.length : 'All'})
                  </Button>

                  <Button
                    onClick={()=>{setIsReviewerDialogOpen(true)}}
                    variant='outline'
                    size='sm'
                  >
                    <Shuffle className='mr-2 h-4 w-4' /> Auto-assign Reviewers(
                    {selectedTask.length > 0 ? selectedTask.length : 'All'})
                  </Button>

                  {judges.length > 0 && (
                    <Button
                      onClick={handleAssignAI}
                      variant='outline'
                      size='sm'
                    >
                      <Bot className='mr-2 h-4 w-4' /> Assign AI
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Tabs Content */}
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
              />
            </TabsContent>
          </Tabs>
        </>
      </main>
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
        <ReviewerDialogComponent isOpen={isReviewerDialogOpen} onClose={()=>setIsReviewerDialogOpen(false)} reviewers={filteredReviewers} tasks={tasks} setTasks={setTasks} selectedTasks={selectedTask} ></ReviewerDialogComponent>
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
