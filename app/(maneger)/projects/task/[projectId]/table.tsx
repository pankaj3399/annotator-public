import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import {
  CalendarIcon,
  NotebookPen,
  RefreshCcw,
  Search,
  Trash2Icon,
} from 'lucide-react';
import { toast } from 'sonner';
import useJobList from '@/hooks/use-jobList';
import { getStatusBadgeVariant } from '@/lib/constants';
import { formatTime } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { addJob, deleteJobByTaskid } from '@/app/actions/aiModel';
import { Judge } from '../../ai-config/[projectId]/page';
import { Annotator, Task } from './page';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { compareWithGroundTruth } from '@/app/actions/task';
import { CaretSortIcon } from '@radix-ui/react-icons';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
interface TaskTableProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  selectedTask: Task[];
  setSelectedTask: React.Dispatch<React.SetStateAction<Task[]>>;
  annotators: Annotator[];
  reviewers: Annotator[];
  judges: Judge[];
  handleAssignUser: (
    annotatorId: string,
    taskId: string,
    ai: boolean,
    isReviewer?: boolean
  ) => void;
  handleDeleteTemplate: (e: React.MouseEvent, _id: string) => void;
  router: any;
  session: {
    user?: {
      id: string;
      role?: string;
      name?: string;
    };
  };
  currentPage: number;
  onPageChange: (page: number) => void;
  totalPages: number;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  totalItems: number;
}

export function TaskTable({
  tasks,
  setTasks,
  selectedTask,
  setSelectedTask,
  annotators,
  reviewers,
  judges,
  handleAssignUser,
  handleDeleteTemplate,
  router,
  session,
  currentPage,
  onPageChange,
  totalPages,
  pageSize,
  onPageSizeChange,
  totalItems,
}: TaskTableProps) {
  const [dialog, setDialog] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isGrading, setIsGrading] = useState(false);
  const [gradingProgress, setGradingProgress] = useState(0);
  const [assigneeSearch, setAssigneeSearch] = useState({
    value: '',
    focused: false,
  });
  const [reviewerSearch, setReviewerSearch] = useState({
    value: '',
    focused: false,
  });
  const { setJob, getJobs, removeJobByTaskid } = useJobList();
  const checkboxRef = useRef<HTMLInputElement | null>(null);
  const pathName = usePathname();

  const projectId = pathName.split('/')[3];
  // Filter reviewers to only show those with "canReview" permission

  const handleClick = (e: React.MouseEvent, feedback: string) => {
    e.stopPropagation();
    setFeedback(feedback);
    setDialog(true);
  };

  // Helper function to get display name for users
  const getUserDisplayName = (user: Annotator | null): string => {
    if (!user)
      return session?.user?.role === 'project manager'
        ? 'Project Manager'
        : 'Unassigned';
    let name = user.name;
    if (user._id === session?.user?.id) {
      name += ' (Project Manager)';
    }
    return name;
  };

  const handleAssigneeChange = async (value: string, task: Task) => {
    try {
      // Check if selecting AI model
      const exist = judges.find((judge) => judge._id === value);
      if (exist) {
        if (getJobs().some((job) => job.taskid === task._id)) {
          const res = await deleteJobByTaskid(task._id);
          if (res.error) {
            toast.error(res.error);
            return;
          }
          removeJobByTaskid(task._id);
        }
        const res = await addJob(value, task._id, projectId);
        if (res.error) {
          toast.error(res.error);
          return;
        }
        setJob(JSON.parse(res.model as string));
        handleAssignUser(value, task._id, true);
        return;
      }

      // If value is empty or unassigned
      if (!value || value === 'unassigned') {
        if (getJobs().some((job) => job.taskid === task._id)) {
          const res = await deleteJobByTaskid(task._id);
          if (res.error) {
            toast.error(res.error);
            return;
          }
          removeJobByTaskid(task._id);
        }
        handleAssignUser('', task._id, false);
        return;
      }

      // Check if annotator and reviewer would be the same
      if (value === task.reviewer) {
        toast.error('Annotator cannot be the same as reviewer');
        return;
      }

      handleAssignUser(value, task._id, false);
    } catch (error) {
      toast.error('Failed to assign annotator');
    }
  };
  const handleSelect = (task: Task) => {
    setSelectedTask((prev) =>
      prev.some((selectedTask) => selectedTask._id === task._id)
        ? prev.filter((selectedTask) => selectedTask._id !== task._id)
        : [...prev, task]
    );
  };

  const handleSelectAll = () => {
    if (selectedTask.length === tasks.length) {
      setSelectedTask([]); // Deselect all tasks if all are selected
    } else {
      setSelectedTask(tasks); // Select all tasks (ensure tasks are Task[] type)
    }
  };

  const handleReviewerChange = async (value: string, task: Task) => {
    try {
      const actualValue = value === 'unassigned' ? '' : value;
      console.log('value:', actualValue);

      // Check if reviewer would be same as annotator
      if (actualValue === task.annotator) {
        toast.error('Reviewer cannot be the same as annotator');
        return;
      }

      handleAssignUser(actualValue, task._id, false, true);
    } catch (error) {
      toast.error('Failed to assign reviewer');
    }
  };

  async function handleGradeTasks() {
    setIsGrading(true);
    try {
      const pendingTasks = tasks.filter((task) => task.status === 'pending');
      let gradedTasksCount = 0;

      for (const task of pendingTasks) {
        try {
          await compareWithGroundTruth(task._id);
          gradedTasksCount++;
          setGradingProgress((gradedTasksCount / pendingTasks.length) * 100);
        } catch (error: any) {
          if (error.message === 'Ground truth not set') {
            toast.error('No ground truth set. Please set ground truth first.');
          } else {
            console.error('Error grading tasks:', error);
            toast.error(
              'Please set one task as  a ground truth to be able to auto grade'
            );
          }
          setIsGrading(false);
          setGradingProgress(0);
          return;
        }
      }

      if (gradedTasksCount === pendingTasks.length && pendingTasks.length > 0) {
        toast.success('All tasks graded successfully');
        router.refresh();
      }
    } catch (error) {
      console.error('Error grading tasks:', error);
      toast.error('Failed to grade some tasks');
    } finally {
      setIsGrading(false);
      setGradingProgress(0);
    }
  }
  return (
    <div className='bg-white shadow-sm rounded-lg overflow-hidden'>
      <div className='flex justify-end'>
        <Button
          onClick={handleGradeTasks}
          disabled={isGrading}
          variant='outline'
          size='sm'
        >
          <RefreshCcw
            className={`h-4 w-4 mr-2 ${isGrading ? 'animate-spin' : ''}`}
          />
          Grade Tasks
        </Button>
      </div>
      {isGrading && (
        <div className='flex items-center justify-end gap-2'>
          <div className='h-2 w-48 bg-gray-200 rounded-full overflow-hidden'>
            <div
              className='h-full bg-blue-500 transition-all duration-300'
              style={{ width: `${gradingProgress}%` }}
            />
          </div>
          <span className='text-sm text-gray-600'>
            {Math.round(gradingProgress)}%
          </span>
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className='w-12'>
              <input
                type='checkbox'
                className='rounded border-zinc-300 dark:border-zinc-600'
                onChange={handleSelectAll}
                checked={
                  selectedTask.length === tasks.length &&
                  selectedTask.length > 0
                } // Check if all tasks are selected
              />
            </TableHead>{' '}
            <TableHead>Tasks Name</TableHead>
            <TableHead>Created Date</TableHead>
            <TableHead>Assignee</TableHead>
            <TableHead>Reviewer</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className='text-center'>Time Taken</TableHead>
            <TableHead className='text-center'>Submitted</TableHead>
            <TableHead className='text-right'>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task: Task) => {
            const assignedAnnotator = annotators.find(
              (a) => a._id === task.annotator
            );
            const assignedReviewer =
              reviewers.find((r) => r._id === task.reviewer) ||
              (session?.user && task.reviewer === session.user.id
                ? ({
                    _id: session.user.id,
                    name: session.user.name || 'Project Manager',
                    email: '',
                    lastLogin: '',
                    permission: ['canReview'],
                  } as Annotator)
                : null);
            const assignedJudge = judges.find((j) => j._id === task.ai);

            return (
              <TableRow
                key={task._id}
                onClick={() => {
                  router.push(`/task/${task._id}`);
                }}
                className='cursor-pointer hover:bg-gray-50'
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <input
                    type='checkbox'
                    checked={selectedTask.some(
                      (selected) => selected._id === task._id
                    )}
                    onChange={() => handleSelect(task)}
                    className='rounded border-zinc-300 dark:border-zinc-600'
                  />
                </TableCell>
                <TableCell className='font-medium'>{task.name}</TableCell>
                <TableCell>
                  <div className='flex items-center text-sm text-gray-500'>
                    <CalendarIcon className='mr-2 h-4 w-4' />
                    {format(parseISO(task.created_at), 'PPP')}
                  </div>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant='outline'
                        className='w-[180px] justify-between'
                      >
                        {task.ai
                          ? assignedJudge?.name
                          : task.annotator
                            ? assignedAnnotator?.name
                            : 'Unassigned'}
                        <CaretSortIcon className=' h-4 w-4 shrink-0 opacity-50' />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className='w-[180px] p-0' side='bottom'>
                      <Command>
                        <div className='flex items-center pb-2 border-b'>
                          <CommandInput
                            placeholder='Search assignees...'
                            value={assigneeSearch.value}
                            onValueChange={(value) =>
                              setAssigneeSearch({ value, focused: true })
                            }
                            className='h-8'
                          />
                        </div>
                        <CommandList>
                          <CommandGroup>
                            <CommandItem
                              value='unassigned'
                              onSelect={() =>
                                handleAssigneeChange('unassigned', task)
                              }
                            >
                              Unassigned
                            </CommandItem>
                            {judges
                              .filter((judge) =>
                                judge.name
                                  .toLowerCase()
                                  .includes(assigneeSearch.value.toLowerCase())
                              )
                              .map((judge) => (
                                <CommandItem
                                  key={judge._id}
                                  value={judge._id}
                                  onSelect={() =>
                                    handleAssigneeChange(judge._id, task)
                                  }
                                >
                                  {judge.name} (AI)
                                </CommandItem>
                              ))}
                            {annotators
                              .filter(
                                (annotator) =>
                                  annotator._id !== session?.user?.id &&
                                  annotator.name
                                    .toLowerCase()
                                    .includes(
                                      assigneeSearch.value.toLowerCase()
                                    )
                              )
                              .map((annotator) => (
                                <CommandItem
                                  key={annotator._id}
                                  value={annotator._id}
                                  onSelect={() =>
                                    handleAssigneeChange(annotator._id, task)
                                  }
                                  disabled={annotator._id === task.reviewer}
                                >
                                  {annotator.name}
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </TableCell>

                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant='outline'
                        className='w-[180px] justify-between'
                      >
                        {getUserDisplayName(assignedReviewer)}
                        <CaretSortIcon className='h-4 w-4 shrink-0 opacity-50' />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className='w-[180px] p-0' side='bottom'>
                      <Command>
                        <div className='flex items-center pb-2 border-b'>
                          <CommandInput
                            placeholder='Search reviewers...'
                            value={reviewerSearch.value}
                            onValueChange={(value) =>
                              setReviewerSearch({ value, focused: true })
                            }
                            className='h-8'
                          />
                        </div>
                        <CommandList>
                          <CommandGroup>
                            {reviewers
                              .sort((a, b) => {
                                if (a._id === session?.user?.id) return -1;
                                if (b._id === session?.user?.id) return 1;
                                return a.name.localeCompare(b.name);
                              })
                              .filter((reviewer) =>
                                getUserDisplayName(reviewer)
                                  .toLowerCase()
                                  .includes(reviewerSearch.value.toLowerCase())
                              )
                              .map((reviewer) => (
                                <CommandItem
                                  key={reviewer._id}
                                  value={reviewer._id}
                                  onSelect={() =>
                                    handleReviewerChange(reviewer._id, task)
                                  }
                                  disabled={reviewer._id === task.annotator}
                                >
                                  {getUserDisplayName(reviewer)}
                                  {reviewer._id === task.annotator
                                    ? ' (Annotator)'
                                    : ''}
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </TableCell>
                <TableCell className='font-medium'>
                  <Badge variant={getStatusBadgeVariant(task.status)}>
                    {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell className='font-medium text-center'>
                  {formatTime(task.timeTaken)}
                </TableCell>
                <TableCell className='font-medium text-center'>
                  <span
                    role='img'
                    aria-label={task.submitted ? 'Submitted' : 'Not submitted'}
                  >
                    {task.submitted ? '✔️' : '❌'}
                  </span>
                </TableCell>
                <TableCell className='text-right'>
                  {task.feedback && (
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={(e) => handleClick(e, task.feedback)}
                    >
                      <NotebookPen className='h-4 w-4' />
                      <span className='sr-only'>feedback</span>
                    </Button>
                  )}
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={(e) => handleDeleteTemplate(e, task._id)}
                  >
                    <Trash2Icon className='h-4 w-4' />
                    <span className='sr-only'>Delete</span>
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <div className='flex items-center justify-between px-2 mt-6 mb-4'>
        <div className='flex items-center gap-4'>
          <div className='flex items-center gap-2'>
            <span className='text-sm text-gray-600'>Items per page:</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => onPageSizeChange(Number(value))}
            >
              <SelectTrigger className='w-[80px]'>
                <SelectValue>{pageSize}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 50, 100].map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <span className='text-sm text-gray-600'>
            Showing {Math.min((currentPage - 1) * pageSize + 1, totalItems)} to{' '}
            {Math.min(currentPage * pageSize, totalItems)} of {totalItems} items
          </span>
        </div>

        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href={`?page=${currentPage - 1}`}
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage > 1) onPageChange(currentPage - 1);
                }}
                className={
                  currentPage === 1 ? 'pointer-events-none opacity-50' : ''
                }
              />
            </PaginationItem>
            {[...Array(totalPages)].map((_, index) => {
              const pageNumber = index + 1;
              if (
                pageNumber === 1 ||
                pageNumber === totalPages ||
                (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
              ) {
                return (
                  <PaginationItem key={pageNumber}>
                    <PaginationLink
                      href={`?page=${pageNumber}`}
                      onClick={(e) => {
                        e.preventDefault();
                        onPageChange(pageNumber);
                      }}
                      isActive={pageNumber === currentPage}
                    >
                      {pageNumber}
                    </PaginationLink>
                  </PaginationItem>
                );
              } else if (
                pageNumber === currentPage - 2 ||
                pageNumber === currentPage + 2
              ) {
                return <PaginationEllipsis key={pageNumber} />;
              }
              return null;
            })}
            <PaginationItem>
              <PaginationNext
                href={`?page=${currentPage + 1}`}
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage < totalPages) onPageChange(currentPage + 1);
                }}
                className={
                  currentPage === totalPages
                    ? 'pointer-events-none opacity-50'
                    : ''
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Feedback</DialogTitle>
            <DialogDescription>{feedback}</DialogDescription>
          </DialogHeader>
          <DialogFooter className='sm:justify-start'>
            <DialogClose asChild>
              <Button type='button' variant='secondary'>
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
