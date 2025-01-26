'use client';
import { applyForJob } from '@/app/actions/job';
import {
  assignUserToTask,
  createTasks,
  getDistinctProjectsByAnnotator,
  getProjectsWithRepeatTasks,
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
export default function ProjectDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const { data: session } = useSession();
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
        // Get all distinct projects assigned to the annotator
        const assignedProjects = await getDistinctProjectsByAnnotator();
        const projectsWithRepeatTasks = await getProjectsWithRepeatTasks();

        // Parse both results
        const assignedProjectsList = JSON.parse(assignedProjects);
        const projectsWithTestsList = JSON.parse(projectsWithRepeatTasks);

        // Create a Set of project IDs that have repeat tasks
        const testProjectIds = new Set<string>(
          projectsWithTestsList.map((p: Project) => p._id.toString())
        );
        setProjectsWithTests(testProjectIds);

        // Combine and deduplicate projects
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

  const handleTakeTestClick = async (projectId: string) => {
    try {
      if (!session?.user?.id) {
        toast.error('User session not found');
        return;
      }

      // Get test tasks for this project
      const response = await handleTakeTest(projectId, session.user.id);

      if (response.success) {
        toast.success('Test tasks assigned successfully');
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
                      {projectsWithTests.has(project._id) && (
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTakeTestClick(project._id);
                          }}
                        >
                          <ClipboardList className='mr-2 h-4 w-4' />
                          Take Test
                        </Button>
                      )}
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
