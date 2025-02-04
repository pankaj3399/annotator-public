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
import { getLabels } from '@/app/actions/label';
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
import { format, parseISO } from 'date-fns';
import { CalendarIcon, ClipboardList } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getTemplateLabel } from '@/app/actions/template';

export interface Project {
  _id: string;
  name: string;
  created_at: string;
  templates: string[];
  labels: string[];
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

interface CustomLabel {
  name: string;
  color?: string;
}

type LabelType = 'LLM BENCHMARK' | 'MULTIMODALITY' | 'TRANSLATION' | 'ACCENTS' | 'ENGLISH' | string;

export default function ProjectDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [assignedTestProjects, setAssignedTestProjects] = useState<Set<string>>(new Set());
  const [selectedLabels, setSelectedLabels] = useState<LabelType[]>([]);
  const [projectsWithTests, setProjectsWithTests] = useState<Set<string>>(new Set());
  const [customLabels, setCustomLabels] = useState<CustomLabel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const router = useRouter();
  const { data: session } = useSession();

  const labelStyles: Record<string, string> = {
    'LLM BENCHMARK': 'bg-yellow-200 text-yellow-800',
    'MULTIMODALITY': 'bg-orange-200 text-orange-800',
    'TRANSLATION': 'bg-cyan-200 text-cyan-800',
    'ACCENTS': 'bg-pink-200 text-pink-800',
    'ENGLISH': 'bg-gray-200 text-gray-800',
  };

  const getLabelStyle = (label: string) => {
    if (labelStyles[label]) {
      return labelStyles[label];  // For predefined labels, use the predefined color styles
    }
  
    // For custom labels, set default background and text colors
    return 'bg-gray-200 text-gray-800';
  };
  

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

        const projectsWithLabels = await Promise.all(
          allProjects.map(async (project) => {
            const labels = await Promise.all(
              project.templates.map((templateId: string) => getTemplateLabel(templateId))
            );

            return {
              ...project,
              labels: labels
            };
          })
        );

        setProjects(projectsWithLabels);
        setFilteredProjects(projectsWithLabels);
      } catch (error) {
        console.error('Error loading projects:', error);
        toast.error('Failed to load projects');
      } finally {
        setIsLoading(false);
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

  useEffect(() => {
    const fetchCustomLabels = async () => {
      try {
        const fetchedLabels = await getLabels();
        const parsedLabels = JSON.parse(fetchedLabels)
        setCustomLabels(parsedLabels || []);
      } catch (error) {
        console.error('Error fetching custom labels:', error);
        toast.error('Failed to load custom labels');
      }
    };

    fetchCustomLabels();
  }, []);

  const handleLabelClick = (label: LabelType) => {
    const newSelectedLabels = selectedLabels.includes(label)
      ? selectedLabels.filter((l) => l !== label)
      : [...selectedLabels, label];

    setSelectedLabels(newSelectedLabels);

    let filtered = projects;

    if (searchQuery) {
      filtered = filtered.filter((project) =>
        project.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (newSelectedLabels.length > 0) {
      filtered = filtered.filter((project) => {
        const projectLabels = project.labels.flatMap(labelString => {
          try {
            return JSON.parse(labelString);
          } catch (e) {
            return [labelString];
          }
        });

        return newSelectedLabels.every(label =>
          projectLabels.includes(label) ||
          project.labels.includes(label)
        );
      });
    }

    setFilteredProjects(filtered);
  };

  const handleTakeTestClick = async (projectId: string) => {
    try {
      if (!session?.user?.id) {
        toast.error('User session not found');
        return;
      }

      const response = await handleTakeTest(projectId, session.user.id) as TakeTestResponse;

      if (response.success) {
        toast.success('Test tasks assigned successfully');
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

    let filtered = projects.filter((project) =>
      project.name.toLowerCase().includes(query)
    );

    if (selectedLabels.length > 0) {
      filtered = filtered.filter((project) => {
        const projectLabels = project.labels.flatMap(labelString => {
          try {
            return JSON.parse(labelString);
          } catch (e) {
            return [labelString];
          }
        });

        return selectedLabels.every(label =>
          projectLabels.includes(label) ||
          project.labels.includes(label)
        );
      });
    }

    setFilteredProjects(filtered);
  };

  const handleProjectClick = (projectId: string) => {
    router.push(`/tasks/${projectId}`);
  };

  if (!session) {
    return <Loader />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader />
      </div>
    );
  }

  return (
    <div className='min-h-screen'>
      <header className='bg-white'>
        <div className='max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center'>
          <h1 className='text-3xl font-bold text-gray-900 tracking-tight'>
            Project
          </h1>
          <SheetMenu />
        </div>
      </header>
      <main className='max-w-7xl mx-auto sm:px-6 lg:px-8'>
        <form onSubmit={(e) => e.preventDefault()} className='mb-8'>
          <div className='flex gap-4 mb-6'>
            <Input
              type='text'
              placeholder='Search projects'
              value={searchQuery}
              onChange={handleSearchChange}
              className='flex-grow'
            />
          </div>

          <div className="flex flex-wrap gap-3 mb-6">
  {[...Object.keys(labelStyles), ...customLabels.map(label => label.name)].map((label) => (
    <button
      key={label}
      onClick={() => handleLabelClick(label)}
      className={`
        px-4 py-2 rounded-md transition-all duration-200
        ${getLabelStyle(label)}
        ${selectedLabels.includes(label)
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

        </form>

        {filteredProjects.length === 0 ? (
          <div className='text-center py-10'>
            <h2 className='text-xl font-semibold text-gray-900'>
              No projects found
            </h2>
            <p className='mt-2 text-gray-600'>
              Try adjusting your search or filter criteria
            </p>
          </div>
        ) : (
          <div className='bg-white shadow-sm rounded-lg overflow-hidden'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project Name</TableHead>
                  <TableHead>Actions</TableHead>
                  <TableHead className="text-right">Created Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.map((project) => (
                  <TableRow
                    key={project._id}
                    onClick={() => handleProjectClick(project._id)}
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    <TableCell className="font-medium">{project.name}</TableCell>
                    <TableCell className="text-center">
                      {(() => {
                        const projectId = project._id.trim();
                        const hasTests = projectsWithTests.has(projectId);
                        const isAssigned = assignedTestProjects.has(projectId);

                        return hasTests && !isAssigned ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTakeTestClick(projectId);
                            }}
                          >
                            <ClipboardList className="mr-2 h-4 w-4" />
                            Take Test
                          </Button>
                        ) : null;
                      })()}
                    </TableCell>
                    <TableCell className="text-right text-sm text-gray-500">
                      <CalendarIcon className="inline-block mr-2 h-4 w-4" />
                      {format(parseISO(project?.created_at), 'PPP')}
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