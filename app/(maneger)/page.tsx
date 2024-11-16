'use client'
import { SheetMenu } from "@/components/admin-panel/sheet-menu"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Loader from '@/components/ui/Loader/Loader'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { format, parseISO } from "date-fns"
import jsonToCsvExport from "json-to-csv-export"
import { CalendarIcon, FileDown, PlusCircle, Trash2Icon } from "lucide-react"
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getAllAcceptedTasks } from "../actions/task"
import { extractElementDetails, parseAndAddSelectedItemsToArray } from "./export"

export interface Project {
  _id: string
  name: string
  created_at: string
}

type ExportItem = {
  name: string
  content: string
}

export default function ProjectDashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [newProjectName, setNewProjectName] = useState('')
  const [open, setOpen] = useState(false)
  const [res, setRes] = useState([])
  const [name, setName] = useState('')
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [exportItems, setExportItems] = useState<ExportItem[]>([]);
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast()

  useEffect(() => {
    if (session) {
      if (session?.user?.role === 'annotator') router.push('/tasks');
      fetch('/api/projects')
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setProjects(data.projects);
          }
        })
        .catch((error) =>
          toast({
            variant: "destructive",
            title: "Uh oh! Something went wrong.",
            description: error.message,
          }));
    }
  }, [session, router, toast]);

  if (!session) {
    return <Loader />;
  }

  const handleCheckboxChange = (itemName: string) => {
    setSelectedItems(prev =>
      prev.includes(itemName)
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    )
  }

  const handleProjectClick = (project_id: string) => {
    router.push(`/projects/${project_id}`);
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault()
    fetch(`/api/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: newProjectName.trim() }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const error = await res.json()
          toast({
            variant: "destructive",
            title: "Uh oh! Something went wrong.",
            description: error.message,
          });
        } else {
          const data = await res.json()
          setProjects([...projects, data.project])
          setNewProjectName('')
        }
      })
      .catch((error) =>
        toast({
          variant: "destructive",
          title: "Uh oh! Something went wrong.",
          description: error.message,
        })
      );
  }


  const handledownload = async (e: React.MouseEvent, project: Project) => {
    e.stopPropagation()
    const res = JSON.parse(await getAllAcceptedTasks(project._id))
    if (res.length === 0) {
      toast({
        variant: "destructive",
        title: "No submitted tasks found",
      })
      return
    }
    const extractedElements = extractElementDetails(JSON.parse(res[0].content));
    setRes(res)
    setName(project.name)
    setExportItems(extractedElements)
    setOpen(true)
  }

  const handleExport = (format: string) => {
    const exportItems = parseAndAddSelectedItemsToArray(res, selectedItems)
    if (format === 'json') {

      const dataStr = JSON.stringify(exportItems, null, 2)
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)

      const exportFileDefaultName = `${name}.json`
      const linkElement = document.createElement('a')
      linkElement.setAttribute('href', dataUri)
      linkElement.setAttribute('download', exportFileDefaultName)
      linkElement.click()
    } else {
      jsonToCsvExport({ data: exportItems, filename: `${name}.csv` })
    }

    setOpen(false)
    setRes([])
    setName('')
    setExportItems([])
    setSelectedItems([])
  }

  const handleDeleteProject = (e: React.MouseEvent, _id: string) => {
    e.stopPropagation()
    fetch(`/api/projects`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ _id }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const error = await res.json()
          toast({
            variant: "destructive",
            title: "Uh oh! Something went wrong.",
            description: error.message,
          });
        } else {
          setProjects(projects.filter(project => project._id !== _id))
        }
      })
      .catch((error) =>
        toast({
          variant: "destructive",
          title: "Uh oh! Something went wrong.",
          description: error.message,
        })
      );
  }

  if (session?.user?.role === 'project manager')
    return (
      <div className="min-h-screen ">
        <header className="bg-white ">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Project</h1>
            <SheetMenu />
          </div>
        </header>
        <main className="max-w-7xl mx-auto  sm:px-6 lg:px-8">
          <form onSubmit={handleCreateProject} className="mb-8">
            <div className="flex gap-4">
              <Input
                type="text"
                placeholder="New project name"
                required
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="flex-grow"
              />
              <Button type="submit">
                <PlusCircle className="mr-2 h-4 w-4" /> Create Project
              </Button>
            </div>
          </form>
          {projects.length === 0 ? (
            <div className="text-center py-10">
              <h2 className="text-xl font-semibold text-gray-900">No projects yet</h2>
              <p className="mt-2 text-gray-600">Create your first project to get started!</p>
            </div>
          ) : (
            <div className="bg-white shadow-sm rounded-lg overflow-h_idden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project Name</TableHead>
                    <TableHead>Created Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project) => (
                    <TableRow
                      key={project._id}
                      onClick={() => handleProjectClick(project._id)}
                      className="cursor-pointer hover:bg-gray-50"
                    >
                      <TableCell className="font-medium">{project.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm text-gray-500">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(parseISO(project.created_at), 'PPP')}

                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handledownload(e, project)}
                        >
                          <FileDown className="h-4 w-4" />
                          <span className="sr-only">download</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDeleteProject(e, project._id)}
                        >
                          <Trash2Icon className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Export Data</DialogTitle>
                      <DialogDescription>
                        Select the items you want to export. Click export when you&apos;re done.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      {exportItems.map((item) => (
                        <div className="flex items-center space-x-2" key={item.name}>
                          <Checkbox
                            id={item.name}
                            checked={selectedItems.includes(item.name)}
                            onCheckedChange={() => handleCheckboxChange(item.name)}
                          />
                          <Label htmlFor={item.name}>{item.name}</Label>
                        </div>
                      ))}
                    </div>
                    <DialogFooter>
                      <Button type="submit" onClick={() => handleExport('csv')} disabled={selectedItems.length === 0}>
                        Export CSV
                      </Button>
                      <Button type="submit" onClick={() => handleExport('json')} disabled={selectedItems.length === 0}>
                        Export JSON
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </Table>
            </div>
          )}
        </main>
      </div>
    )
}