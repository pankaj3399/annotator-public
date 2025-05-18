'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Book,
  Database,
  LayoutTemplate,
  Users,
  Phone,
  Settings,
  ClipboardList,
  BarChart,
  ArrowRight,
  Star,
  DollarSign,
  UserPlus,
  UserCheck,
  Check,
  UsersRound,
  Bell,
  FileText,
  NotebookText,
  Link as LinkIcon,
  TestTube,
  GraduationCap,
  Rocket,
  FileType2,
  FileType,
  FilePlus,
  FileSpreadsheet,
  PieChart,
  Activity,
  Bot,
  NotepadText,
  NotepadTextDashed,
} from 'lucide-react';
import Link from 'next/link';
import Loader from '@/components/ui/NewLoader/Loader';
import { useToast } from '@/hooks/use-toast';

interface Project {
  _id: string;
  name: string;
}

export default function Pipeline() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (projectId) {
      setIsLoading(true);
      fetch(`/api/projects/${projectId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setProject(data.project);
          } else {
            toast({
              variant: 'destructive',
              title: 'Error loading project',
              description: data.message || 'Failed to load project details',
            });
          }
          setIsLoading(false);
        })
        .catch((error) => {
          toast({
            variant: 'destructive',
            title: 'Error loading project',
            description: error.message || 'An unknown error occurred',
          });
          setIsLoading(false);
        });
    }
  }, [projectId, toast]);

  if (isLoading) {
    return <Loader />;
  }

  if (!project) {
    return (
      <div className='flex items-center justify-center h-full'>
        <p>No project found</p>
      </div>
    );
  }

  const pipelineSteps = [
    {
      title: 'Knowledge Collection',
      icon: Book,
      description:
        'Collect project summaries, guidelines, and have discussions with the team and client in a Reddit-style format.',
      path: `/projects/guidelines/${projectId}`,
      items: [
        {
          name: 'Guidelines',
          path: `/projects/guidelines/${projectId}`,
          icon: FileText,
        },
        // {
        //   name: 'Summary',
        //   path: `/projects/summary/${projectId}`,
        //   icon: FileType2,
        // },
        {
          name: 'Discussion',
          path: `/projects/discussion/${projectId}`,
          icon: FileType,
        },
      ],
    },
    {
      title: 'Data Management',
      icon: Database,
      description:
        'Ingest data from AWS, Google Drive, or local uploads. Run exploratory data analysis or preprocessing using Jupyter Notebook.',
      path: `/projects/data`,
      items: [
        { name: 'Connector', path: `/projects/data`, icon: LinkIcon },
        {
          name: 'Notebook',
          path: `/dataScientist/notebook`,
          icon: NotebookText,
        },
      ],
    },
    {
      title: 'UI Builder',
      icon: LayoutTemplate,
      description:
        'Build interfaces for testing candidates, training them, and creating the production environment for the project.',
      path: `/projects/template/test/${projectId}`, // Default to test templates
      items: [
        {
          name: 'Create Test',
          path: `/projects/template/test/${projectId}`,
          icon: TestTube,
        },
        {
          name: 'Create Training',
          path: `/projects/template/training/${projectId}`,
          icon: GraduationCap,
        },
        {
          name: 'Create Production',
          path: `/projects/template/core/${projectId}`,
          icon: Rocket,
        },
      ],
    },
    {
      title: 'Resource Management',
      icon: Users,
      description:
        'Post jobs for the project, manage job listings, and follow up with applicants.',
      path: `/projects/job-list/${projectId}`,
      items: [
        {
          name: 'Post Job',
          path: `/projects/job-list/create/${projectId}`,
          icon: UserPlus,
        },
        {
          name: 'Job List',
          path: `/projects/job-list/${projectId}`,
          icon: FileSpreadsheet,
        },
        {
          name: 'Job Applicants',
          path: `/projects/job-applications/${projectId}`,
          icon: UserPlus,
        },
        // {
        //   name: 'Onboarded Experts',
        //   path: `/onboarded-annotator/${projectId}`,
        //   icon: UserCheck,
        // },
      ],
    },
    {
      title: 'Tasks Management',
      icon: NotepadText,
      description: 'Manage and track all project tasks efficiently',
      path: `/projects/template/test/${projectId}`, // Default to test templates
      items: [
        {
          name: 'Tasks',
          path: `/projects/task/${projectId}`,
          icon: NotepadTextDashed,
        },
      ],
    },
    {
      title: 'Settings & Configuration',
      icon: Settings,
      description:
        'Set up AI expert as a tasker or reviewer. Configure email notifications for experts based on task status.',
      path: `/projects/ai-config/${projectId}`,
      items: [
        {
          name: 'AI Expert',
          path: `/projects/ai-config/${projectId}`,
          icon: Bot,
        },
        {
          name: 'Settings',
          path: `/projects/settings/${projectId}`,
          icon: Settings,
        },
        {
          name: 'Notification',
          path: `/projects/notification/${projectId}`,
          icon: Bell,
        },
      ],
    },

    {
      title: 'Kickoff Session',
      icon: GraduationCap,
      description:
        'Run kickoff sessions and meetings using the webinar live meeting feature native to Blolabel.',
      path: `/projects/training/${projectId}`,
      items: [ {
        name: 'Training',
        path: `/projects/template/training/${projectId}`,
        icon: GraduationCap,
      },],
    },

    {
      title: 'Analytics & Reporting',
      icon: BarChart,
      description:
        'View dashboards and reports for project health metrics, QA metrics, and expert leaderboards.',
      path: `/projects/analytics/view/${projectId}`,
      items: [
        {
          name: 'Overview',
          path: `/projects/analytics/view/${projectId}`,
          icon: PieChart,
        },
        { name: 'Dashboard', path: `/dashboard`, icon: BarChart },

        {
          name: 'Leaderboard',
          path: `/projects/leaderboard/${projectId}`,
          icon: Activity,
        },
      ],
    },
    {
      title: 'Expert Ratings',
      icon: Star,
      description:
        'Rate and review expert performance with star ratings and detailed feedback.',
      path: `/agencyOwner/reviewsAndRatings`,
      items: [
        {
          name: 'Add Rating',
          path: `/agencyOwner/reviewsAndRatings/add`,
          icon: Star,
        },
        {
          name: 'View Ratings',
          path: `/agencyOwner/reviewsAndRatings/view`,
          icon: ClipboardList,
        },
      ],
    },
    {
      title: 'Payment Reports',
      icon: DollarSign,
      description:
        'Track and manage all project-related payments and financial reports.',
      path: `/bank`,
      items: [
        { name: 'Payment History', path: `/bank/history`, icon: FileText },
        { name: 'Financial Summary', path: `/bank/summary`, icon: BarChart },
      ],
    },
  ];

  const rows = [
    pipelineSteps.slice(0, 2), // Knowledge & Data
    pipelineSteps.slice(2, 4), // Templates & Resources
    pipelineSteps.slice(4, 6), // UI Builder & Kickoff Session
    pipelineSteps.slice(6, 8), // Settings & Analytics
    pipelineSteps.slice(8, 10), // Expert Ratings & Payment Reports
  ];

  return (
    <div className='space-y-6 max-w-7xl mx-auto px-4'>
      <h1 className='text-2xl font-bold'>{project.name} - Project Pipeline</h1>
      <p className='text-muted-foreground'>
        This is the workflow of your project from knowledge collection to final
        delivery. Click on any stage to navigate.
      </p>

      <div className='space-y-8'>
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className='relative bg-gray-50 rounded-lg p-6'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              {row.map((step, index) => (
                <div key={step.title} className='relative group'>
                  {rowIndex * 2 + index < pipelineSteps.length - 1 && (
                    <div
                      className={`hidden md:block absolute z-10 ${
                        index === 0
                          ? '-right-3 top-1/2 transform -translate-y-1/2' // Horizontal arrow
                          : 'right-full -bottom-12 transform translate-y-1/2 rotate-45' // Diagonal arrow to next row
                      }`}
                    >
                      <ArrowRight
                        className={`h-7 w-7 text-blue-500 animate-pulse ${
                          index === 1 ? 'rotate-45' : ''
                        }`}
                      />
                    </div>
                  )}

                  <Link href={step.path}>
                    <Card className='hover:shadow-md transition-shadow h-full'>
                      <CardHeader className='flex flex-row items-start space-y-0 pb-2'>
                        <div className='mr-4 p-1.5 bg-blue-50 rounded-lg'>
                          <step.icon className='h-5 w-5 text-blue-500' />
                        </div>
                        <div className='flex-1'>
                          <CardTitle className='text-lg'>
                            {step.title}
                          </CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className='text-md text-muted-foreground mb-3'>
                          {step.description}
                        </p>

                        {step.items.length > 0 && (
                          <div className='flex flex-wrap gap-1.5 mt-2'>
                            {step.items.map((item) => (
                              <Link
                                key={item.path}
                                href={item.path}
                                className='text-xs px-2 py-0.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors flex items-center'
                              >
                                {item.icon && (
                                  <item.icon className='w-3 h-3 mr-1' />
                                )}
                                {item.name}
                              </Link>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
