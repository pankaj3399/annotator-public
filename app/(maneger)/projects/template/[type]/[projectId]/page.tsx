'use client';
import { Project } from '@/app/(maneger)/page';
import {
  DeleteTemplate,
  UpdateVisibilityTemplate,
  upsertTemplate,
} from '@/app/actions/template';
import { template } from '@/app/template/page';
import { SheetMenu } from '@/components/admin-panel/sheet-menu';
import { TaskDialog } from '@/components/taskDialog';
import { TemplateCopier } from '@/components/template-copier';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Loader from '@/components/ui/NewLoader/Loader';
import { DataLoadingSpinner } from '@/components/ui/DataLoadingSpinner';
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
import {
  CalendarIcon,
  ChevronDown,
  Copy,
  Edit2Icon,
  Eye,
  EyeOff,
  PlusCircle,
  Tag,
  Trash2Icon,
  X,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getAllAnnotators } from '@/app/actions/annotator';
import { changeAnnotator } from '@/app/actions/task';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getAIModels } from '@/app/actions/aiModel';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import ProjectLabelManager from '@/components/LabelManager';

interface Model {
  _id: string;
  user: string;
  projectid: string;
  name: string;
  apiKey: string;
  provider: string;
  enabled: boolean;
  model: string;
}
type CreateTemplateInput = {
  name: string;
  project: string;
  type: 'test' | 'training' | 'core';
};

export default function TemplatesByType() {
  // Get URL parameters using useParams hook
  const params = useParams();
  const projectId = params.projectId as string;
  const templateType = params.type as 'test' | 'training' | 'core';

  const [templates, setTemplates] = useState<template[]>([]);
  const [project, setProject] = useState<Project>();
  const [newTemplateName, setNewTemplateName] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDialogOpen2, setIsDialogOpen2] = useState(false);
  const [template, setTemplate] = useState<template>();
  const [annotators, setAnnotators] = useState<any[]>([]);
  const [models, setModels] = useState<Model[] | undefined>(undefined);
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();
  const [isDataLoading, setIsDataLoading] = useState(true);

  // Fetch annotators and AI models
  useEffect(() => {
    if (session) {
      const fetchAnnotators = async () => {
        try {
          const annotatorsData = JSON.parse(await getAllAnnotators());
          setAnnotators(annotatorsData);
        } catch (error: any) {
          toast({
            variant: 'destructive',
            title: 'Failed to fetch annotators',
            description: error.message,
          });
        }
      };
      fetchAnnotators();
      fetchAIModels(projectId);
    }
  }, [session, projectId, toast]);

  // Fetch project data and filter templates by type
  useEffect(() => {
    let isMounted = true;
    if (session && projectId) {
      setIsDataLoading(true);
      fetch('/api/projects?projectId=' + projectId)
        .then((res) => res.json())
        .then((data) => {
          if (isMounted) {
            if (data.success) {
              setProject(data.project);
              if (data.project.name) {
                setNewTemplateName(data.project.name);
              }
              if (data.project.templates) {
                // Filter templates based on the templateType from the URL
                const filteredTemplates = data.project.templates.filter(
                  (t: template) => t.type === templateType
                );
                setTemplates(filteredTemplates);
              }
            } else {
              toast({
                variant: 'destructive',
                title: 'Failed to load project',
                description: data.error || 'Unknown error',
              });
            }
          }
        })
        .catch((error) => {
          if (isMounted) {
            toast({
              variant: 'destructive',
              title: 'Uh oh! Something went wrong.',
              description: error.message,
            });
          }
        })
        .finally(() => {
          if (isMounted) {
            setIsDataLoading(false);
          }
        });
    } else {
      if (isMounted) setIsDataLoading(false);
    }
    return () => {
      isMounted = false;
    };
  }, [session, projectId, templateType, toast]);

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
      return res;
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to assign user',
        description: error.message,
      });
      throw error;
    }
  }

  const fetchAIModels = async (projectid: string) => {
    if (session) {
      try {
        const response = await getAIModels(projectid);
        if (typeof response === 'string') {
          const parsedResponse = JSON.parse(response);
          if (parsedResponse.error) {
            console.error('Error fetching AI models:', parsedResponse.error);
            return;
          }
          setModels(parsedResponse.models);
        } else {
          console.error('Unexpected response format:', response);
        }
      } catch (error) {
        console.error('Error during fetchAIModels:', error);
      }
    }
  };

  if (!session) {
    return <Loader />;
  }

  if (session?.user?.role === 'annotator') {
    router.push('/tasks');
    return <Loader />;
  }

  if (isDataLoading) {
    return <Loader />;
  }

  const handleTemplateClick = (temp: template) => {
    setTemplate(temp);
    setIsDialogOpen(true);
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    const defaultTemplate: CreateTemplateInput = {
      name: newTemplateName.trim(),
      project: projectId,
      type: templateType, // Use the type from URL params
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

  const handleEditTemplate = (e: React.MouseEvent, _id: string) => {
    e.stopPropagation();
    router.push(`/template?Id=${_id}`);
  };

  const handleCopyTemplate = async (e: React.MouseEvent, temp: template) => {
    e.stopPropagation();
    setTemplate(temp);
    setIsDialogOpen2(true);
  };

  const handleDeleteTemplate = async (e: React.MouseEvent, _id: string) => {
    e.stopPropagation();
    const res = await DeleteTemplate(_id);
    if (!res.success) {
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: res.error,
      });
    } else {
      setTemplates(templates.filter((project) => project._id !== _id));
    }
  };

  async function handleVisibility(e: React.MouseEvent, _id: string) {
    e.stopPropagation();
    const currentTemplate = templates.find((template) => template._id === _id);
    const newVisibility = !currentTemplate?.private;

    const res = await UpdateVisibilityTemplate(_id, newVisibility);
    if (!res.success) {
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: res.error,
      });
    } else {
      setTemplates(
        templates.map((template) =>
          template._id === _id
            ? { ...template, private: newVisibility }
            : template
        )
      );
    }
  }

  // Show proper template type label in UI
  const typeDisplayMap = {
    'test': 'Test Templates',
    'training': 'Training Templates',
    'core': 'Core Templates',
  };
  
  const templateTypeDisplay = typeDisplayMap[templateType] || 'Templates';

  return (
    <div className='min-h-screen'>
      <header className='bg-white'>
        <div className='max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center'>
          <h1 className='text-3xl font-bold text-gray-900 tracking-tight'>
            {project?.name} - {templateTypeDisplay}
          </h1>
          <div className='hidden sm:block'>
            {project && (
              <ProjectLabelManager
                projectId={projectId}
                project={project}
                setProject={setProject}
              />
            )}
          </div>
          <SheetMenu />
        </div>
      </header>

      <main className='max-w-7xl mx-auto sm:px-6 lg:px-8'>
        {/* Create Template Form */}
        <form
          onSubmit={handleCreateTemplate}
          className='flex mb-6 items-center space-x-4'
        >
          <Input
            type='text'
            required
            placeholder={`New ${templateType} template name`}
            value={newTemplateName}
            onChange={(e) => setNewTemplateName(e.target.value)}
            className='flex-grow w-9/12'
          />
          <Button type='submit'>
            <PlusCircle className='mr-2 h-4 w-4' /> Create {templateType} Template
          </Button>
        </form>

        {/* Templates Table */}
        {templates.length === 0 && !isDataLoading ? (
          <div className='text-center py-10'>
            <h2 className='text-xl font-semibold text-gray-900'>
              No {templateTypeDisplay} yet
            </h2>
            <p className='mt-2 text-gray-600'>
              Create your first {templateType} template to get started!
            </p>
            <Suggesion projectId={projectId} templateType={templateType} />
          </div>
        ) : (
          !isDataLoading && (
            <div className='bg-white shadow-sm rounded-lg overflow-hidden'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template Name</TableHead>
                    <TableHead>Created Date</TableHead>
                    <TableHead className='text-right'>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow
                      key={template._id}
                      onClick={() => handleTemplateClick(template)}
                      className='cursor-pointer hover:bg-gray-50'
                    >
                      <TableCell className='font-medium'>
                        {template.name}
                      </TableCell>
                      <TableCell>
                        <div className='flex items-center text-sm text-gray-500'>
                          <CalendarIcon className='mr-2 h-4 w-4' />
                          {template.created_at ? format(parseISO(template.created_at), 'PPP') : 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell className='text-right'>
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={(e) => handleVisibility(e, template._id)}
                        >
                          {template.private ? (
                            <EyeOff className='h-4 w-4' />
                          ) : (
                            <Eye className='h-4 w-4' />
                          )}
                        </Button>
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={(e) => handleCopyTemplate(e, template)}
                        >
                          <Copy className='h-4 w-4' />
                        </Button>
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={(e) => handleEditTemplate(e, template._id)}
                        >
                          <Edit2Icon className='h-4 w-4' />
                        </Button>
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={(e) => handleDeleteTemplate(e, template._id)}
                        >
                          <Trash2Icon className='h-4 w-4' />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )
        )}

        {/* Dialogs */}
        {project && template && (
          <TaskDialog
            onConfigure={fetchAIModels}
            aiModels={models}
            template={template}
            setIsDialogOpen={setIsDialogOpen}
            isDialogOpen={isDialogOpen}
            project={project}
            handleAssignUser={handleAssignUser}
          />
        )}
        {project && template && (
          <TemplateCopier
            template={template}
            setIsDialogOpen={setIsDialogOpen2}
            isDialogOpen={isDialogOpen2}
          />
        )}
      </main>
    </div>
  );
}

// Modified Suggestion component to filter by template type
export function Suggesion({ projectId, templateType }: { projectId: string, templateType: string }) {
  const [templates, setTemplates] = useState<template[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [end, setEnd] = useState(false);
  const router = useRouter();

  async function fetchTemplates() {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/template/recent?type=${templateType}`);
      const data = await res.json();
      if (data.success) {
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
    setIsLoading(false);
  }

  async function ViewMore() {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/template/recent?limit=20&type=${templateType}&time=` +
          new Date(templates[templates.length - 1].created_at).toISOString()
      );
      const data = await res.json();
      if (data.success) {
        if (data.templates.length == 0) {
          setEnd(true);
          return;
        }
        setTemplates((p) => [...p, ...data.templates]);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    fetchTemplates();
  }, [templateType]);

  function onclick(template: template) {
    router.push(`/preview?projectId=${projectId}&templateId=${template._id}`);
  }

  return (
    <div className='space-y-6 mt-20'>
      {templates.length > 0 && (
        <h2 className='text-2xl font-bold text-gray-900'>
          Suggested {templateType} Templates
        </h2>
      )}
      <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 max-w-4xl mx-auto'>
        {templates.map((template) => (
          <Card
            key={template._id}
            className='hover:shadow-md transition-shadow cursor-pointer aspect-square flex flex-col items-center justify-center text-center p-2'
            onClick={() => onclick(template)}
          >
            <CardContent className='p-0 flex flex-col items-center justify-center h-full'>
              <div className='text-4xl mb-2'>📄</div>
              <div className='text-sm font-medium'>{template.name}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      {!end && templates.length >= 6 && (
        <Button
          onClick={() => ViewMore()}
          variant='outline'
          className='mt-4'
          disabled={isLoading}
        >
          <>
            View More
            <ChevronDown className='ml-2 h-4 w-4' />
          </>
        </Button>
      )}
    </div>
  );
}