'use client';
import { applyForJob } from '@/app/actions/job';
import {
  assignUserToTask,
  createTasks,
  getDistinctProjectsByAnnotator,
  getProjectsWithRepeatTasks,
  getTasksOfAnnotator,
  getTestTemplateTasks,
  handleTakeTest,
} from '@/app/actions/task';
import { SheetMenu } from '@/components/admin-panel/sheet-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Loader from '@/components/ui/Loader/Loader';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { CalendarIcon, PlusCircle, Trash2Icon } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ClipboardList } from 'lucide-react';

export interface Project {
  _id: string;
  name: string;
  created_at: string;
}
interface TestTask {
  project: string;
  name: string;
  content: string;
  timer: number;
  reviewer?: string;
  type?: string;
}

interface TaskResponse {
  success: boolean;
  tasks: TestTask[];
  count?: number;
}
interface TestTaskResponse {
  project: string;
  _id: string;
  name: string;
  content: string;
  timer: number;
  reviewer?: string;
  type?: string;
}
interface TakeTestResponse {
  success: boolean;
  message?: string;
  tasks?: TestTaskResponse[];
}

export default function ProjectDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const { data: session } = useSession();
  const [assignedTestProjects, setAssignedTestProjects] = useState<Set<string>>(new Set());
  const [projectsWithTests, setProjectsWithTests] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    const jobId = localStorage.getItem('pendingJobApplication');

    const handlePendingJobApplication = async () => {
      const response = await applyForJob(jobId as string);
      if (response?.success) {
        toast.success('Job successfully applied');
        localStorage.removeItem('pendingJobApplication');
        router.push('/tasks');
      } else if (response?.error && jobId != null) {
        toast.error(response.error);
        router.push(`/jobs/${jobId}`);
      }
    };

    if (jobId) {
      handlePendingJobApplication();
    }
  }, []);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const assignedProjects = await getDistinctProjectsByAnnotator();
        const projectsWithRepeatTasks = await getProjectsWithRepeatTasks();

        const assignedProjectsList = JSON.parse(assignedProjects);
        const projectsWithTestsList = JSON.parse(projectsWithRepeatTasks);

        // Important: Don't use toString() here as _id is already a string
        const testProjectIds = new Set<string>(
          projectsWithTestsList.map((p: Project) => p._id)
        );
        setProjectsWithTests(testProjectIds);

        const allProjects = [...assignedProjectsList];
        projectsWithTestsList.forEach((project: Project) => {
          if (!allProjects.some((p) => p._id === project._id)) {
            allProjects.push(project);
          }
        });

        setProjects(allProjects);
        setFilteredProjects(allProjects);
      } catch (error) {
        console.error('Error loading projects:', error);
        toast.error('Failed to load projects');
      }
    };

    loadProjects();
  }, []);

  useEffect(() => {
    const fetchAssignedTests = async () => {
      try {
        const testTasksResponse = await getTasksOfAnnotator('test');
        const testTasks = JSON.parse(testTasksResponse) as TestTaskResponse[];
        
        const assignedProjects = new Set<string>(
          testTasks.map((task) => task.project)
        );
        
        setAssignedTestProjects(assignedProjects);
      } catch (error) {
        console.error('Error fetching assigned tests:', error);
      }
    };

    if (session?.user?.id) {
      fetchAssignedTests();
    }
  }, [session?.user?.id]);

  const handleTakeTestClick = async (projectId: string) => {
    try {
      if (!session?.user?.id) {
        toast.error('User session not found');
        return;
      }
  
      const response = await handleTakeTest(projectId, session.user.id) as TakeTestResponse;
  
      if (response.success) {
        toast.success('Test tasks assigned successfully');
        // Create new Set with spread operator ensuring string type
        setAssignedTestProjects(prev => new Set<string>([...prev, projectId]));
        router.push(`/tasks/${projectId}`);
      } else {
        toast.error(response.message || 'Failed to assign test tasks');
      }
    } catch (error) {
      console.error('Error taking test:', error);
      toast.error('Failed to assign test tasks');
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);

    const filtered = projects.filter((project) =>
      project.name.toLowerCase().includes(query)
    );
    setFilteredProjects(filtered); // Update the filtered list of projects
  };

  if (!session) {
    return <Loader />;
  }

  const handleProjectClick = (projectId: string) => {
    router.push(`/tasks/${projectId}`);
  };

  return (
    <div className='min-h-screen '>
      <header className='bg-white '>
        <div className='max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center'>
          <h1 className='text-3xl font-bold text-gray-900 tracking-tight'>
            Project
          </h1>
          <SheetMenu />
        </div>
      </header>
      <main className='max-w-7xl mx-auto  sm:px-6 lg:px-8'>
        <form onSubmit={(e) => e.preventDefault()} className='mb-8'>
          <div className='flex gap-4'>
            <Input
              type='text'
              placeholder='Search projects'
              required
              value={searchQuery}
              onChange={handleSearchChange}
              className='flex-grow'
            />
            {/* <Button type="submit">
              <PlusCircle className="mr-2 h-4 w-4" /> Create Project
            </Button> */}
          </div>
        </form>
        {filteredProjects.length === 0 ? (
          <div className='text-center py-10'>
            <h2 className='text-xl font-semibold text-gray-900'>
              No projects yet
            </h2>
            <p className='mt-2 text-gray-600'>
              No projects have been assigned to you
            </p>
          </div>
        ) : (
          <div className='bg-white shadow-sm rounded-lg overflow-h_idden'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project Name</TableHead>
                  <TableHead className='text-right'>Created Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.map((project) => (
                  <TableRow
                    key={project._id}
                    onClick={() => handleProjectClick(project._id)}
                    className='cursor-pointer hover:bg-gray-50'
                  >
                    <TableCell className='font-medium'>
                      {project.name}
                    </TableCell>
                    <TableCell>
      {(() => {
        const projectId = project._id.trim();
        const hasTests = projectsWithTests.has(projectId);
        const isAssigned = assignedTestProjects.has(projectId);

        return hasTests && !isAssigned ? (
          <Button
            variant='outline'
            size='sm'
            onClick={(e) => {
              e.stopPropagation();
              handleTakeTestClick(projectId);
            }}
          >
            <ClipboardList className='mr-2 h-4 w-4' />
            Take Test
          </Button>
        ) : null;
      })()}
    </TableCell>
                    <TableCell className='text-right'>
                      <div className='flex justify-end items-center text-sm text-gray-500'>
                        <CalendarIcon className='mr-2 h-4 w-4' />
                        {format(parseISO(project?.created_at), 'PPP')}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>
    </div>
  );
}
