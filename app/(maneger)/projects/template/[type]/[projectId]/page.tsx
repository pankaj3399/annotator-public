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
import { Label } from '@/components/ui/label';
import Loader from '@/components/ui/NewLoader/Loader';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
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
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getAllAnnotators } from '@/app/actions/annotator';
import { changeAnnotator } from '@/app/actions/task';
import ProjectLabelManager from '@/components/LabelManager';
import { getAIModels } from '@/app/actions/aiModel';
import {
  ErrorBoundary,
  useErrorHandler,
} from '@/components/ErrorBoundaryWrapper';

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

function TemplatesByTypeContent() {
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
  const [createTemplateDialogOpen, setCreateTemplateDialogOpen] =
    useState(false);
  const { handleError } = useErrorHandler();

  // Fetch annotators and AI models
  useEffect(() => {
    if (session) {
      const fetchAnnotators = async () => {
        const annotatorsData = JSON.parse(await getAllAnnotators());
        setAnnotators(annotatorsData);
      };
      fetchAnnotators().catch(handleError);
      fetchAIModels(projectId).catch(handleError);
    }
  }, [session, projectId, handleError]);

  // Fetch project data and filter templates by type
  useEffect(() => {
    let isMounted = true;
    if (session && projectId) {
      setIsDataLoading(true);
      fetch('/api/projects?projectId=' + projectId)
        .then(async (res) => {
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: Database connection failed`);
          }

          let data;
          try {
            data = await res.json();
          } catch (jsonError) {
            throw new Error(
              'Database connection timeout - invalid response format'
            );
          }

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
              throw new Error(data.error || 'Failed to load project');
            }
          }
        })
        .catch((error) => {
          if (isMounted) {
            handleError(error);
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
  }, [session, projectId, templateType, handleError]);

  async function handleAssignUser(
    annotatorId: string,
    taskId: string,
    ai: boolean,
    isReviewer: boolean = false
  ) {
    const res = JSON.parse(
      await changeAnnotator(taskId, annotatorId, ai, isReviewer)
    );
    return res;
  }

  const fetchAIModels = async (projectid: string) => {
    if (session) {
      const response = await getAIModels(projectid);
      if (typeof response === 'string') {
        const parsedResponse = JSON.parse(response);
        if (parsedResponse.error) {
          throw new Error(parsedResponse.error);
        }
        setModels(parsedResponse.models);
      } else {
        throw new Error('Unexpected response format from AI models API');
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

  // Handle create tasks button click
  const handleCreateTasks = (e: React.MouseEvent, temp: template) => {
    e.stopPropagation();
    setTemplate(temp);
    setIsDialogOpen(true);
  };

  // Handle create template with dialog (using templateType from URL)
  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    const defaultTemplate: CreateTemplateInput = {
      name: newTemplateName.trim(),
      project: projectId,
      type: templateType, // Use templateType from URL params, not state
    };

    const template: template = JSON.parse(
      await upsertTemplate(
        projectId as string,
        defaultTemplate as template,
        undefined,
        true
      )
    );
    setCreateTemplateDialogOpen(false); // Close the dialog
    toast({
      title: 'Template created successfully',
    });
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
      throw new Error(res.error || 'Failed to delete template');
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
      throw new Error(res.error || 'Failed to update template visibility');
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
    test: 'Test Templates',
    training: 'Training Templates',
    core: 'Core Templates',
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
        {/* Button aligned to right */}
        <div className='mb-6 flex justify-end'>
          <Button onClick={() => setCreateTemplateDialogOpen(true)}>
            <PlusCircle className='mr-2 h-4 w-4' /> Create Template
          </Button>
        </div>

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
                    <TableHead>Create Tasks</TableHead>
                    <TableHead className='text-right'>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template._id} className='hover:bg-gray-50'>
                      <TableCell className='font-medium'>
                        {template.name}
                      </TableCell>
                      <TableCell>
                        <div className='flex items-center text-sm text-gray-500'>
                          <CalendarIcon className='mr-2 h-4 w-4' />
                          {template.created_at
                            ? format(parseISO(template.created_at), 'PPP')
                            : 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant='default'
                          size='sm'
                          onClick={(e) => handleCreateTasks(e, template)}
                          className='bg-black text-white'
                        >
                          Create {templateType} Tasks
                        </Button>
                      </TableCell>
                      <TableCell className='text-right'>
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={(e) =>
                            handleVisibility(e, template._id).catch(handleError)
                          }
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
                          onClick={(e) =>
                            handleCopyTemplate(e, template).catch(handleError)
                          }
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
                          onClick={(e) =>
                            handleDeleteTemplate(e, template._id).catch(
                              handleError
                            )
                          }
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

        {/* Create Template Dialog */}
        <Dialog
          open={createTemplateDialogOpen}
          onOpenChange={setCreateTemplateDialogOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New {templateType} Template</DialogTitle>
              <DialogDescription>
                Enter a name for your new {templateType} template.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => handleCreateTemplate(e).catch(handleError)}>
              <div className='grid gap-4 py-4'>
                <div className='grid grid-cols-4 items-center gap-4'>
                  <Label htmlFor='templateName' className='text-right'>
                    Name
                  </Label>
                  <Input
                    id='templateName'
                    type='text'
                    placeholder={`Enter ${templateType} template name`}
                    required
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    className='col-span-3'
                    autoFocus
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => {
                    setCreateTemplateDialogOpen(false);
                    setNewTemplateName(project?.name || ''); // Reset to project name
                  }}
                >
                  Cancel
                </Button>
                <Button type='submit'>Create Template</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Task Creation Dialog */}
        {project && template && (
          <TaskDialog
            onConfigure={(projectId) =>
              fetchAIModels(projectId).catch(handleError)
            }
            aiModels={models}
            template={template}
            setIsDialogOpen={setIsDialogOpen}
            isDialogOpen={isDialogOpen}
            project={project}
            handleAssignUser={handleAssignUser}
          />
        )}
        {/* Template Copy Dialog */}
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
export function Suggesion({
  projectId,
  templateType,
}: {
  projectId: string;
  templateType: string;
}) {
  const [templates, setTemplates] = useState<template[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [end, setEnd] = useState(false);
  const router = useRouter();
  const { handleError } = useErrorHandler();

  async function fetchTemplates() {
    setIsLoading(true);
    const res = await fetch(`/api/template/recent?type=${templateType}`);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: Database connection failed`);
    }

    let data;
    try {
      data = await res.json();
    } catch (jsonError) {
      throw new Error('Database connection timeout - invalid response format');
    }

    if (data.success) {
      setTemplates(data.templates);
    } else {
      throw new Error(data.error || 'Failed to fetch templates');
    }
    setIsLoading(false);
  }

  async function ViewMore() {
    setIsLoading(true);
    const res = await fetch(
      `/api/template/recent?limit=20&type=${templateType}&time=` +
        new Date(templates[templates.length - 1].created_at).toISOString()
    );

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: Database connection failed`);
    }

    let data;
    try {
      data = await res.json();
    } catch (jsonError) {
      throw new Error('Database connection timeout - invalid response format');
    }

    if (data.success) {
      if (data.templates.length == 0) {
        setEnd(true);
        return;
      }
      setTemplates((p) => [...p, ...data.templates]);
    } else {
      throw new Error(data.error || 'Failed to fetch more templates');
    }
    setIsLoading(false);
  }

  useEffect(() => {
    fetchTemplates().catch(handleError);
  }, [templateType, handleError]);

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
          onClick={() => ViewMore().catch(handleError)}
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

export default function TemplatesByType() {
  return (
    <ErrorBoundary>
      <TemplatesByTypeContent />
    </ErrorBoundary>
  );
}
