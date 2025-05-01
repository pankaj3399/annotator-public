// app/(maneger)/projects/[projectId]/page.tsx
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
import Loader from '@/components/ui/NewLoader/Loader'; // <<< KEEP ORIGINAL LOADER IMPORT
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
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react'; // <<< Keep original useState/useEffect import
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

// --- KEEP ORIGINAL INTERFACES ---
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

export default function ProjectDashboard() {
  // --- KEEP ORIGINAL STATE VARIABLES ---
  const [templates, setTemplates] = useState<template[]>([]);
  const [project, setProject] = useState<Project>();
  const pathName = usePathname();
  const projectId = pathName.split('/')[2];
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateType, setNewTemplateType] = useState('test');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDialogOpen2, setIsDialogOpen2] = useState(false);
  const [template, setTemplate] = useState<template>();
  const [annotators, setAnnotators] = useState<any[]>([]);
  const [newLabel, setNewLabel] = useState('');
  const [models, setModels] = useState<Model[] | undefined>(undefined);
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();
  const [isDataLoading, setIsDataLoading] = useState(true); // <<< ADDED LOADER STATE

  // --- KEEP ORIGINAL useEffect for Annotators/Models ---
  useEffect(() => {
    if (session) {
      const fetchAnnotators = async () => {
        try {
          const annotatorsData = JSON.parse(await getAllAnnotators());
          setAnnotators(annotatorsData); // Assuming this state update is okay on its own
        } catch (error: any) {
          toast({
            variant: 'destructive',
            title: 'Failed to fetch annotators',
            description: error.message,
          });
        }
      };
      fetchAnnotators();
      fetchAIModels(projectId); // Assuming this state update is okay on its own
    }
  }, [session, projectId]); // Added projectId dependency as it was used

  // --- KEEP ORIGINAL handleAssignUser ---
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

  // --- MODIFIED useEffect for Project Fetch (to add loading state) ---
  useEffect(() => {
    let isMounted = true; // Prevent state update on unmounted component
    if (session && projectId) {
      setIsDataLoading(true); // <<< SET LOADING TRUE
      fetch('/api/projects?projectId=' + projectId)
        .then((res) => res.json())
        .then((data) => {
          if (isMounted) { // Check if component is still mounted
            if (data.success) {
              setProject(data.project);
              if (data.project.name) {
                setNewTemplateName(data.project.name);
              }
              if (data.project.templates) setTemplates(data.project.templates);
            } else {
               // Keep original error handling structure if any, or add toast
               toast({ variant: 'destructive', title: 'Failed to load project', description: data.error || 'Unknown error' });
            }
          }
        })
        .catch((error) => {
          if (isMounted) { // Check if component is still mounted
            toast({
              variant: 'destructive',
              title: 'Uh oh! Something went wrong.',
              description: error.message,
            });
          }
        })
        .finally(() => {
          if (isMounted) { // Check if component is still mounted
            setIsDataLoading(false); // <<< SET LOADING FALSE
          }
        });
    } else {
       // If session or projectId is not available, ensure loading is false
       if (isMounted) setIsDataLoading(false);
    }
    // Cleanup function to set isMounted to false when the component unmounts
    return () => { isMounted = false; };
  }, [session, projectId, toast]); // Keep original dependencies + toast

  // --- KEEP ORIGINAL fetchAIModels ---
  const fetchAIModels = async (projectid: string) => {
    if (session) { // Keep original session check inside
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

  // --- KEEP ORIGINAL Session Check ---
  if (!session) {
    return <Loader />; // Use original Loader
  }

  // --- KEEP ORIGINAL Role Check ---
  if (session?.user?.role === 'annotator') {
     router.push('/tasks');
     return <Loader />; // Use original Loader during redirect
  }

  // <<< ADDED Data Loading Check >>>
  if (isDataLoading) {
      return <Loader/>;
  }

  // --- KEEP ORIGINAL handler functions ---
  const handleTemplateClick = (temp: template) => {
    setTemplate(temp);
    setIsDialogOpen(true);
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    const defaultTemplate: CreateTemplateInput = {
      name: newTemplateName.trim(),
      project: projectId,
      type: newTemplateType.trim() as 'test' | 'training' | 'core',
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
    const currentTemplate = templates.find((template) => template._id === _id); // Keep safety find
    const newVisibility = !currentTemplate?.private; // Keep safe access

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
            ? { ...template, private: newVisibility } // Keep calculated newVisibility
            : template
        )
      );
    }
  }

  // --- KEEP ORIGINAL RETURN JSX ---
  return (
    <div className='min-h-screen'>
      <header className='bg-white'>
        <div className='max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center'>
          <h1 className='text-3xl font-bold text-gray-900 tracking-tight'>
            Project - {project?.name} {/* Keep original optional chaining */}
          </h1>{' '}
          <div className='hidden sm:block'>
            {project && ( // Keep original conditional render
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
            placeholder='New Template name'
            value={newTemplateName}
            onChange={(e) => setNewTemplateName(e.target.value)}
            className='flex-grow w-9/12'
          />
          <Select
            value={newTemplateType}
            onValueChange={(value) =>
              setNewTemplateType(value as 'test' | 'training' | 'core')
            }
          >
            <SelectTrigger className='w-24'>
              <SelectValue>{newTemplateType}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='test'>Test</SelectItem>
              <SelectItem value='training'>Training</SelectItem>
              <SelectItem value='core'>Core</SelectItem>
            </SelectContent>
          </Select>
          <Button type='submit'>
            <PlusCircle className='mr-2 h-4 w-4' /> Create Template
          </Button>
        </form>

        {/* Templates Table */}
        {/* Keep original conditional rendering */}
        {templates.length === 0 && !isDataLoading ? ( // Add !isDataLoading check here
          <div className='text-center py-10'>
            <h2 className='text-xl font-semibold text-gray-900'>
              No Template yet
            </h2>
            <p className='mt-2 text-gray-600'>
              Create your first Template to get started!
            </p>
            <Suggesion />
          </div>
        ) : (
          !isDataLoading && ( // Wrap table rendering in !isDataLoading check
            <div className='bg-white shadow-sm rounded-lg overflow-hidden'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template Name</TableHead>
                    <TableHead>Created Date</TableHead>
                    <TableHead>Type</TableHead>
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
                           {/* Keep original formatting, add safe check */}
                          {template.created_at ? format(parseISO(template.created_at), 'PPP') : 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell className='font-medium'>
                        {template.type}
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
        {/* Keep original dialog rendering */}
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

// --- KEEP ORIGINAL Suggesion Component ---
export function Suggesion() {
  const [templates, setTemplates] = useState<template[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [end, setEnd] = useState(false);

  const router = useRouter();
  const pathName = usePathname();
  const projectId = pathName.split('/')[2];

  async function fetchTemplates() {
    setIsLoading(true);
    try {
      const res = await fetch('/api/template/recent');
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
        '/api/template/recent?limit=20&&time=' +
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
  }, []);

  function onclick(template: template) {
    // Keep original navigation logic
    router.push(`/preview?projectId=${projectId}&templateId=${template._id}`);
  }

  return (
    <div className='space-y-6 mt-20'>
      {templates.length > 0 && (
        <h2 className='text-2xl font-bold text-gray-900'>
          Suggestion Templates
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