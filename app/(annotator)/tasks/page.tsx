'use client';

import { applyForJob } from '@/app/actions/job';
import {
  getDistinctProjectsByAnnotator,
  getProjectsWithRepeatTasks,
  getTasksOfAnnotator,
  handleTakeTest,
} from '@/app/actions/task';
import { getLabels, getProjectLabels } from '@/app/actions/label';
import { SheetMenu } from '@/components/admin-panel/sheet-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Loader from '@/components/ui/NewLoader/Loader';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format, parseISO } from 'date-fns';
import {
  CalendarIcon,
  ClipboardList,
  GraduationCap,
  MessageCircleIcon,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { BenchmarkProposalForm } from '@/components/BenchmarkProposal';

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

type LabelType = string;

export default function ProjectDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [assignedTestProjects, setAssignedTestProjects] = useState<Set<string>>(
    new Set()
  );
  const [selectedLabels, setSelectedLabels] = useState<LabelType[]>([]);
  const [projectsWithTests, setProjectsWithTests] = useState<Set<string>>(
    new Set()
  );
  const [customLabels, setCustomLabels] = useState<CustomLabel[]>([]);
  const [userProjectLabels, setUserProjectLabels] = useState<string[]>([]);
  const [allAvailableLabels, setAllAvailableLabels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // NEW: State to control benchmark proposal dialog
  const [isBenchmarkProposalOpen, setIsBenchmarkProposalOpen] = useState(false);
  const [benchmarkProposalProject, setBenchmarkProposalProject] =
    useState<Project | null>(null);

  const router = useRouter();
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
      return labelStyles[label]; // Predefined labels use their styles
    }
    // Generate a consistent color based on label name for custom labels
    const colors = [
      'bg-blue-200 text-blue-800',
      'bg-green-200 text-green-800',
      'bg-purple-200 text-purple-800',
      'bg-red-200 text-red-800',
      'bg-indigo-200 text-indigo-800',
      'bg-teal-200 text-teal-800',
    ];
    const hash = label.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  };

  // Extract unique labels from user's projects using server action
  const extractUserProjectLabels = async (projectsList: Project[]) => {
    const uniqueLabels = new Set<string>();

    try {
      // Get labels for each project using the server action
      const labelPromises = projectsList.map((project) =>
        getProjectLabels(project._id)
      );
      const allProjectLabels = await Promise.all(labelPromises);

      // Combine all labels from all projects
      allProjectLabels.forEach((labels) => {
        labels.forEach((label) => {
          if (label && label.trim()) {
            uniqueLabels.add(label.trim());
          }
        });
      });
    } catch (error) {
      console.error('Error fetching project labels:', error);
    }

    return Array.from(uniqueLabels).sort();
  };

  // Handler for benchmark proposal feature.
  // (No change to existing logic; additional state is handled below.)
  const handleBenchmarkProposal = (projectId: string) => {
    toast.success(`Benchmark proposal triggered for project ${projectId}`);
  };

  // Handler for take test feature.
  const handleTakeTestClick = async (projectId: string) => {
    try {
      if (!session?.user?.id) {
        toast.error('User session not found');
        return;
      }
      const response = (await handleTakeTest(
        projectId,
        session.user.id
      )) as TakeTestResponse;
      if (response.success) {
        toast.success('Test tasks assigned successfully');
        setAssignedTestProjects(
          (prev) => new Set<string>([...prev, projectId])
        );
        router.push(`/tasks/${projectId}`);
      } else {
        toast.error(response.message || 'Failed to assign test tasks');
      }
    } catch (error) {
      console.error('Error taking test:', error);
      toast.error('Failed to assign test tasks');
    }
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
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [assignedProjects, projectsWithRepeatTasks] = await Promise.all([
          getDistinctProjectsByAnnotator(),
          getProjectsWithRepeatTasks(),
        ]);
        const assignedProjectsList = assignedProjects;
        const projectsWithTestsList = projectsWithRepeatTasks;

        const testProjectIds = new Set<string>(
          projectsWithTestsList.map((p: Project) => p._id)
        );
        setProjectsWithTests(testProjectIds);

        // Combine projects without fetching template labels
        const allProjects = [...assignedProjectsList];
        projectsWithTestsList.forEach((project: Project) => {
          if (!allProjects.some((p) => p._id === project._id)) {
            allProjects.push(project);
          }
        });

        // Extract unique labels from user's projects using server action
        const uniqueLabels = await extractUserProjectLabels(allProjects);
        setUserProjectLabels(uniqueLabels);
        setAllAvailableLabels(uniqueLabels); // Store all available labels separately

        setProjects(allProjects);
        setFilteredProjects(allProjects);
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchAssignedTests = async () => {
      try {
        if (session?.user?.id) {
          const testTasksResponse = await getTasksOfAnnotator('test');
          const testTasks = JSON.parse(testTasksResponse) as TestTaskResponse[];
          const assignedProjects = new Set<string>(
            testTasks.map((task) => task.project)
          );
          setAssignedTestProjects(assignedProjects);
        }
      } catch (error) {
        console.error('Error fetching assigned tests:', error);
      }
    };
    fetchAssignedTests();
  }, [session?.user?.id]);

  const handleLabelClick = async (label: LabelType) => {
    const newSelectedLabels = selectedLabels.includes(label)
      ? selectedLabels.filter((l) => l !== label)
      : [...selectedLabels, label];

    setSelectedLabels(newSelectedLabels);

    try {
      const [assignedProjects, projectsWithRepeatTasks, fetchedLabels] =
        await Promise.all([
          getDistinctProjectsByAnnotator(newSelectedLabels),
          getProjectsWithRepeatTasks(newSelectedLabels),
          getLabels(),
        ]);

      const assignedProjectsList = assignedProjects;
      const projectsWithTestsList = projectsWithRepeatTasks;
      const parsedLabels = fetchedLabels || [];
      setCustomLabels(parsedLabels);

      const testProjectIds = new Set<string>(
        projectsWithTestsList.map((p: Project) => p._id)
      );
      setProjectsWithTests(testProjectIds);

      // Combine projects
      const allProjects = [...assignedProjectsList];
      projectsWithTestsList.forEach((project: Project) => {
        if (!allProjects.some((p) => p._id === project._id)) {
          allProjects.push(project);
        }
      });

      // Update user project labels based on filtered results
      const uniqueLabels = extractUserProjectLabels(allProjects);
      setUserProjectLabels(uniqueLabels);

      setProjects(allProjects);

      // Apply search filter if exists
      if (searchQuery) {
        const filtered = allProjects.filter((project) =>
          project.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredProjects(filtered);
      } else {
        setFilteredProjects(allProjects);
      }
    } catch (error) {
      console.error('Error fetching filtered projects:', error);
      toast.error('Failed to filter projects');
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);

    const filtered = projects.filter((project) =>
      project.name.toLowerCase().includes(query)
    );
    setFilteredProjects(filtered);
  };

  const handleProjectClick = (projectId: string) => {
    router.push(`/tasks/${projectId}`);
  };
  const handleTrainingClick = (projectId: string) => {
    router.push(`/projects/training/${projectId}`);
  };
  const handleDiscussionClick = (projectId: string) => {
    router.push(`/projects/discussion/${projectId}`);
  };
  if (!session) {
    return <Loader />; // Or redirect to login
  }

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
          {allAvailableLabels.length > 0 && (
            <div className='flex flex-wrap gap-3 mb-6'>
              {allAvailableLabels.map((label) => (
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
          )}
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
                    <TableCell
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent row click
                      }}
                      className='flex items-center gap-2 min-w-[200px]'
                    >
                      {(() => {
                        const projectId = project._id.trim();
                        const hasTests = projectsWithTests.has(projectId);
                        const isAssigned = assignedTestProjects.has(projectId);

                        // Determine if the project has a "LLM BENCHMARK" label
                        const hasLLMBenchmark =
                          project.labels?.includes('LLM BENCHMARK');

                        return (
                          <>
                            {hasTests && !isAssigned && (
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
                            )}

                            <Button
                              variant='outline'
                              size='sm'
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent potential row click
                                handleTrainingClick(project._id); // Call the navigation handler
                              }}
                            >
                              <GraduationCap className='mr-2 h-4 w-4' />
                              Training
                            </Button>
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent potential row click
                                handleDiscussionClick(project._id); // Call the navigation handler
                              }}
                            >
                              <MessageCircleIcon className='mr-2 h-4 w-4' />
                              Discussion
                            </Button>

                            {hasLLMBenchmark && (
                              <Button
                                variant='outline'
                                size='sm'
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setBenchmarkProposalProject(project);
                                  setIsBenchmarkProposalOpen(true);
                                }}
                              >
                                Submit Proposal
                              </Button>
                            )}
                          </>
                        );
                      })()}
                    </TableCell>
                    <TableCell className='text-right text-sm text-gray-500'>
                      <CalendarIcon className='inline-block mr-2 h-4 w-4' />
                      {format(parseISO(project.created_at), 'PPP')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>
      {/* Render the Benchmark Proposal Form dialog controlled by state */}
      {isBenchmarkProposalOpen && benchmarkProposalProject && (
        <BenchmarkProposalForm
          tasks={[
            {
              _id: benchmarkProposalProject._id,
              name: benchmarkProposalProject.name,
              project: {
                _id: benchmarkProposalProject._id,
                labels: benchmarkProposalProject.labels,
              },
              content: '',
              created_at: benchmarkProposalProject.created_at,
              status: '',
              submitted: false,
              feedback: '',
            },
          ]}
          open={isBenchmarkProposalOpen}
          onClose={() => {
            setIsBenchmarkProposalOpen(false);
            setBenchmarkProposalProject(null);
          }}
        />
      )}
    </div>
  );
}
