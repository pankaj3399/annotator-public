'use client'
import { Project } from "@/app/(maneger)/page"
import { DeleteTemplate, UpdateVisibilityTemplate, upsertTemplate } from "@/app/actions/template"
import { template } from "@/app/template/page"
import { SheetMenu } from "@/components/admin-panel/sheet-menu"
import { TaskDialog } from "@/components/taskDialog"
import { TemplateCopier } from "@/components/template-copier"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import Loader from '@/components/ui/Loader/Loader'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { format, parseISO } from "date-fns"
import { CalendarIcon, ChevronDown, Copy, Edit2Icon, Eye, EyeOff, PlusCircle, Trash2Icon } from "lucide-react"
import { useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getAllAnnotators } from "@/app/actions/annotator"
import { changeAnnotator } from "@/app/actions/task"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function ProjectDashboard() {
  const [templates, setTemplates] = useState<template[]>([])
  const [project, setProject] = useState<Project>()
  const pathName = usePathname();
  const projectId = pathName.split("/")[2];
  const [newTemplateName, setNewTemplateName] = useState('')
  const [newTemplateType,setNewTemplateType]=useState('test')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDialogOpen2, setIsDialogOpen2] = useState(false)
  const [template, setTemplate] = useState<template>()
  const [annotators, setAnnotators] = useState<any[]>([])  
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast()


  useEffect(() => {
    if (session) {
      const fetchAnnotators = async () => {
        try {
          const annotatorsData = JSON.parse(await getAllAnnotators());
          setAnnotators(annotatorsData);
        } catch (error: any) {
          toast({
            variant: "destructive",
            title: "Failed to fetch annotators",
            description: error.message,
          });
        }
      };
      fetchAnnotators();
    }
  }, [session]);


  async function handleAssignUser(annotatorId: string, taskId: string, ai: boolean, isReviewer: boolean = false) {
    try {
      const res = JSON.parse(await changeAnnotator(taskId, annotatorId, ai, isReviewer));
      // Note: We don't need to update tasks state here since this is in the template context
      return res;
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to assign user",
        description: error.message,
      });
      throw error;
    }
  }

  useEffect(() => {
    if (session) {
      fetch('/api/projects?projectId=' + projectId)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setProject(data.project);
            if (data.project.name) {
              setNewTemplateName(data.project.name); 
            } if (data.project.templates)
              setTemplates(data.project.templates);
          }
        })
        .catch((error) =>
          toast({
            variant: "destructive",
            title: "Uh oh! Something went wrong.",
            description: error.message,
          }));
    }
  }, [session, projectId, toast]);

  if (!session) {
    return <Loader />;
  }

  if (session?.user?.role === 'annotator') router.push('/tasks');

  const handleTemplateClick = (temp: template) => {
    setTemplate(temp)
    setIsDialogOpen(true)
  };

 const handleCreateTemplate = async (e: React.FormEvent) => {
  e.preventDefault();

  const defaultTemplate = {
    name: newTemplateName.trim(),
    project: projectId,
    type:newTemplateType.trim()
  };

  const template: template = JSON.parse(await upsertTemplate(projectId as string, defaultTemplate as template, undefined, true));
  router.push(`/template?Id=${template._id}`);
};


  const handleEditTemplate = (e: React.MouseEvent, _id: string) => {
    e.stopPropagation()
    router.push(`/template?Id=${_id}`);
  }

  const handleCopyTemplate = async (e: React.MouseEvent, temp: template) => {
    e.stopPropagation()
    setTemplate(temp)
    setIsDialogOpen2(true)
  }

  const handleDeleteTemplate = async (e: React.MouseEvent, _id: string) => {
    e.stopPropagation()
    const res = await DeleteTemplate(_id)
    if (!res.success) {
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: res.error,
      });
    } else {
      setTemplates(templates.filter(project => project._id !== _id))
    }
  }

  async function handleVisibility(e: React.MouseEvent, _id: string) {
    e.stopPropagation()
    const res = await UpdateVisibilityTemplate(_id, !templates.find(template => template._id === _id)?.private)
    if (!res.success) {
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: res.error,
      });
    } else {
      setTemplates(templates.map(template => template._id === _id ? { ...template, private: !template.private } : template))
    }
  }

  return (
    <div className="min-h-screen ">
      <header className="bg-white ">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Project - {project?.name} </h1>
          <SheetMenu />
        </div>
      </header>
      <main className="max-w-7xl mx-auto sm:px-6 lg:px-8">
      <form onSubmit={handleCreateTemplate} className="flex mb-6 items-center space-x-4">
  <Input
    type="text"
    required
    placeholder="New Template name"
    value={newTemplateName}
    onChange={(e) => setNewTemplateName(e.target.value)}
    className="flex-grow w-9/12"
  />
  <div className="flex flex-col items-center">
    <Select
      value={newTemplateType}
      onValueChange={(value) => setNewTemplateType(value as "test" | "training" | "core")}
    >
      <SelectTrigger className="w-24 text-sm"> {/* Reduced width */}
        <SelectValue>{newTemplateType}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="test">Test</SelectItem>
        <SelectItem value="training">Training</SelectItem>
        <SelectItem value="core">Core</SelectItem>
      </SelectContent>
    </Select>
  </div>
  <Button type="submit">
    <PlusCircle className="mr-2 h-4 w-4" /> Create Template
  </Button>
</form>

        {templates.length === 0 ? (
          <div className="text-center py-10">
            <h2 className="text-xl font-semibold text-gray-900">No Template yet</h2>
            <p className="mt-2 text-gray-600">Create your first Template to get started!</p>
            <Suggesion />
          </div>
        ) : (
          <div className="bg-white shadow-sm rounded-lg overflow-h_idden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template Name</TableHead>
                  <TableHead>Created Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow
                    key={template._id}
                    onClick={() => handleTemplateClick(template)}
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm text-gray-500">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(parseISO(template.created_at), 'PPP')}

                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{template.type}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleVisibility(e, template._id)}
                      >
                        {template.private ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        <span className="sr-only">visibility</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleCopyTemplate(e, template)}
                      >
                        <Copy className="h-4 w-4" />
                        <span className="sr-only">copy</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleEditTemplate(e, template._id)}
                      >
                        <Edit2Icon className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDeleteTemplate(e, template._id)}
                      >
                        <Trash2Icon className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {project && template &&   <TaskDialog 
    template={template} 
    setIsDialogOpen={setIsDialogOpen} 
    isDialogOpen={isDialogOpen} 
    project={project} 
    handleAssignUser={handleAssignUser}
  />}
        {project && template && <TemplateCopier template={template} setIsDialogOpen={setIsDialogOpen2} isDialogOpen={isDialogOpen2} />}
      </main>
    </div>
  )
}

export function Suggesion() {
  const [templates, setTemplates] = useState<template[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [end, setEnd] = useState(false)

  const router = useRouter()
  const pathName = usePathname();
  const projectId = pathName.split("/")[2];

  async function fetchTemplates() {
    setIsLoading(true)
    try {
      const res = await fetch('/api/template/recent')
      const data = await res.json()
      if (data.success) {
        setTemplates(data.templates)
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    }
    setIsLoading(false)
  }


  async function ViewMore() {
    setIsLoading(true)
    try {
      const res = await fetch('/api/template/recent?limit=20&&time=' + new Date(templates[templates.length - 1].created_at).toISOString())
      const data = await res.json()
      if (data.success) {
        if (data.templates.length == 0) {
          setEnd(true)
          return
        }
        setTemplates(p => [...p, ...data.templates])
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchTemplates()
  }, [])

  function onclick(template: template) {
    router.push(`/preview?projectId=${projectId}&templateId=${template._id}`);
  }


  return (
    <div className="space-y-6 mt-20">
      {templates.length > 0 && <h2 className="text-2xl font-bold text-gray-900">Suggestion Templates</h2>}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 max-w-4xl mx-auto">
        {templates.map((template) => (
          <Card
            key={template._id}
            className="hover:shadow-md transition-shadow cursor-pointer aspect-square flex flex-col items-center justify-center text-center p-2"
            onClick={() => onclick(template)}
          >
            <CardContent className="p-0 flex flex-col items-center justify-center h-full">
              <div className="text-4xl mb-2">📄</div>
              <div className="text-sm font-medium">{template.name}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      {!end && templates.length >= 6 && <Button
        onClick={() => ViewMore()}
        variant="outline"
        className="mt-4"
        disabled={isLoading}
      >
        <>
          View More
          <ChevronDown className="ml-2 h-4 w-4" />
        </>
      </Button>}
    </div>
  )
}