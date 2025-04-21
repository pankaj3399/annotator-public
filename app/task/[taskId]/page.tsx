//app/task/[taskId]/page.tsx
'use client';
import { getAllTasks, getPaginatedTasks, getTask, getTasksOfAnnotator } from '@/app/actions/task';
import Dock, { StatusType } from '@/components/review-dock';
import Loader from '@/components/ui/NewLoader/Loader';
import { toast } from '@/hooks/use-toast';
import EditorProvider from '@/providers/editor/editor-provider';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Editor from './editor';
import Timer from '@/components/floating-timer-submit';
import useStatus from '@/hooks/use-status';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';

export interface task {
  _id: string;
  name: string;
  project: string;
  created_at: string;
  content: string;
  status: StatusType;
  submitted: boolean;
  reviewer?: string;
  annotator?: string;
  assignedAt?: string;
}

const Page = () => {
  const router = useRouter();
  const pathName = usePathname();
  const searchParams = useSearchParams();
  const taskid = pathName.split('/')[2];
  const tabFilter = searchParams.get('tab') || 'all';
  const projectId = searchParams.get('projectId') || '';
  const taskType = searchParams.get('type') || 'core';

  const [task, setTask] = useState<task>();
  const [loading, setLoading] = useState(true);
  const [navLoading, setNavLoading] = useState(true);
  const [taskIds, setTaskIds] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const { data: session } = useSession();
  const { setStatus, setSubmitted } = useStatus();

  // Fetch current task data
  useEffect(() => {
    const fetchData = async () => {
      // Basic check for invalid taskid early
      if (!taskid || taskid === 'undefined') {
         toast({ variant: 'destructive', title: 'Error', description: 'Invalid Task ID.' });
         router.back();
         setLoading(false);
         return;
      }
      try {
        // No need to setLoading(true) here, initial state is true
        const taskDataString = await getTask(taskid);
         if (!taskDataString) {
            throw new Error('Task not found or failed to load.');
        }
        const taskResult: task = JSON.parse(taskDataString);

        // Basic Access Check (can be expanded later if needed)
        const isManagerOrAdmin = session?.user?.role === 'project manager' || session?.user?.role === 'admin';
        const isAssignedAnnotator = taskResult.annotator === session?.user?.id;
        if (!isManagerOrAdmin && !isAssignedAnnotator && session !== undefined) { // Check session defined to avoid false positive during load
             toast({ variant: 'destructive', title: 'Access Denied', description: 'You are not assigned to this task.' });
             router.push('/tasks/all'); // Redirect annotator
             return; // Stop processing
        }

        setTask(taskResult);
        setStatus(taskResult.status);
        setSubmitted(taskResult.submitted);
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Error Loading Task',
          description: error.message || 'Could not load task details.',
        });
        router.back();
      } finally {
           setLoading(false); // Ensure loading is set to false
      }
    };

    // Only run if taskid is present and session status is not 'loading'
    if (taskid && session !== undefined) { // Check session has loaded or is null
        fetchData();
    }

  }, [taskid, router, setStatus, setSubmitted, session]); // Include session

  // Fetch tasks for navigation based on user type
  useEffect(() => {
    if (!task || !session?.user?.id) return; // Ensure task and session user ID exist

    const fetchTasksForNavigation = async () => {
      try {
        setNavLoading(true);
        let tasksData: task[] = []; // Type tasksData

        // Different fetching strategy based on user role
        if (session.user.role === 'project manager' || session.user.role === 'admin') {
          // Project manager flow - use project-based tasks
          if (projectId) {
            // Fetch all tasks matching the filter for navigation
            const paginatedResponse = JSON.parse(
              await getPaginatedTasks(
                projectId,
                1, // Start page
                tabFilter,
                taskType as any,
                10000 // Large limit to get all relevant tasks for navigation
              )
            );

            if (paginatedResponse?.tasks && Array.isArray(paginatedResponse.tasks)) {
              tasksData = paginatedResponse.tasks;
            } else {
              // Fallback if paginated response fails or is empty
              tasksData = JSON.parse(await getAllTasks(task.project || projectId));
            }
          } else if (task.project) {
            tasksData = JSON.parse(await getAllTasks(task.project));
          }
        } else {
          // Annotator flow - use annotator-specific tasks
          let annotatorTasks: task[] = JSON.parse(await getTasksOfAnnotator(taskType as any));

          // Apply the same filtering logic as in the annotator view
          if (tabFilter === 'submitted') {
            tasksData = annotatorTasks.filter((t: task) => t.submitted === true);
          } else if (tabFilter === 'newTask') {
            tasksData = annotatorTasks.filter((t: task) => t.submitted === false);
          } else if (tabFilter === 'rejected') {
            tasksData = annotatorTasks.filter((t: task) => t.status === 'rejected');
          } else { // 'all' or default
             tasksData = annotatorTasks;
          }
        }

        // Extract task IDs and find current position
        const ids = tasksData.map((t: task) => t._id);
        setTaskIds(ids);
        const index = ids.indexOf(taskid);
        setCurrentIndex(index);

        // console.log(`Current task: ${index + 1} of ${ids.length} tasks`); // Keep for debugging if needed

        if (index === -1 && ids.length > 0) {
            console.warn(`Current task ID ${taskid} not found in the fetched navigation list for filter ${tabFilter}.`);
             toast({
                 variant: 'default',
                 title: 'Navigation Mismatch',
                 description: 'Current task may not match the selected filter. Navigation limited.',
             });
        }

      } catch (error: any) {
        console.error('Error fetching tasks for navigation:', error);
        toast({
          variant: 'default',
          title: 'Navigation Limited',
          description: 'Could not load all tasks for navigation.',
        });
        setTaskIds([]); // Reset on error
        setCurrentIndex(-1);
      } finally {
        setNavLoading(false);
      }
    };

    fetchTasksForNavigation();
  }, [task, taskid, tabFilter, projectId, taskType, session?.user?.role, session?.user?.id]);

  const navigateToTask = (direction: 'next' | 'prev') => {
     // Add guards based on calculated disabled state logic
     if (direction === 'prev' && (navLoading || currentIndex <= 0)) return;
     if (direction === 'next' && (navLoading || currentIndex === -1 || currentIndex >= taskIds.length - 1)) return;

    // Original modulo logic (works but doesn't prevent wrap-around on first/last click)
    // Let's refine to stop at ends if needed, or keep modulo if wrap-around is desired.
    // Assuming we want to STOP at the ends based on button disable logic:

    let newIndex = -1;
    if (direction === 'next' && currentIndex < taskIds.length - 1) {
        newIndex = currentIndex + 1;
    } else if (direction === 'prev' && currentIndex > 0) {
        newIndex = currentIndex - 1;
    }

    if (newIndex !== -1) { // Check if a valid new index was calculated
        const newTaskId = taskIds[newIndex];
        const params = new URLSearchParams(searchParams);
        router.push(`/task/${newTaskId}?${params.toString()}`);
    }
  };
  const goBack = () => {
    if (session?.user?.role === 'project manager' || session?.user?.role === 'admin') {
      // Project manager goes back to project tasks, preserving context
      if (projectId) {
        const params = new URLSearchParams();
        params.set('tab', tabFilter); // Preserve tab
        if (taskType) params.set('type', taskType); // Preserve type
        // Add other relevant filters if needed
        router.push(`/projects/task/${projectId}?${params.toString()}`);
      } else if (task?.project) {
        // Use task.project as a fallback
        const params = new URLSearchParams();
        params.set('tab', tabFilter); // Preserve tab
        if (taskType) params.set('type', taskType); // Preserve type
        router.push('/projects/task/all');
      } else {
        // Last resort fallback
        router.push('/projects');
      }
    } else {
      // Annotator goes back to tasks list, preserving context
      const params = new URLSearchParams();
      params.set('tab', tabFilter); // Preserve tab
      if (taskType) params.set('type', taskType); // Preserve type
      router.push(`/tasks/all?${params.toString()}`);
    }
  };
  const isReviewer = task?.reviewer === session?.user?.id;
  const isAnnotator = task?.annotator === session?.user?.id;
  const isProjectManager = session?.user?.role === 'project manager' || session?.user?.role === 'admin';

  if (loading) {
    return <Loader />;
  }

  // If loading finished but task is still undefined (e.g., due to error or access denial)
  if (!task) {
    // A message or redirect should have happened in useEffect.
    // Returning Loader prevents potential errors trying to render with undefined task.
    return <Loader />;
  }

  const showDock = isProjectManager || isReviewer;
  const showTimer = isAnnotator && !task.submitted && task.status !== 'accepted';

  // Calculate disabled states
  const isPrevDisabled = navLoading || currentIndex <= 0;
  const isNextDisabled = navLoading || currentIndex === -1 || currentIndex >= taskIds.length - 1;


  return (
    <div className='flex flex-col h-screen'>
      {/* Navigation header - fixed position with glass effect */}
      <div className='sticky top-0 z-50 backdrop-blur-sm bg-white/90 border-b border-gray-200 shadow-sm'>
        <div className='max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between'>
          <div className='flex items-center'>
            <Button
              variant='outline'
              size='sm'
              onClick={goBack}
              className='mr-4'
            >
              <ArrowLeft className='mr-2 h-4 w-4' />
              Back to List
            </Button>

            <h1 className='text-lg font-medium truncate max-w-md' title={task.name}>
              {task.name}
            </h1>
          </div>

          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => navigateToTask('prev')}
              disabled={isPrevDisabled} // Use calculated state
              aria-label="Previous Task"
            >
              <ChevronLeft className='mr-1 h-4 w-4' />
              Previous
            </Button>

            <Button
              variant='outline'
              size='sm'
              onClick={() => navigateToTask('next')}
              disabled={isNextDisabled} // Use calculated state
              aria-label="Next Task"
            >
              Next
              <ChevronRight className='ml-1 h-4 w-4' />
            </Button>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className='flex-grow relative overflow-y-auto'>
        <EditorProvider
          subaccountId={task.project}
          funnelId={taskid}
          pageDetails={task}
        >
          <Editor pageId={taskid} liveMode={true} />
          {showDock && <Dock id={taskid} status={task.status} />}
          {showTimer && <Timer />}
        </EditorProvider>
      </div>
    </div>
  );
};

export default Page;