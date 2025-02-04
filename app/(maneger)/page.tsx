'use client';
import { SheetMenu } from '@/components/admin-panel/sheet-menu';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import jsonToCsvExport from 'json-to-csv-export';
import { CalendarIcon, FileDown, PlusCircle, Trash2Icon } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getAllAcceptedTasks } from '../actions/task';
import {
  extractElementDetails,
  parseAndAddSelectedItemsToArray,
} from './export';
import { Badge } from '@/components/ui/badge';
import { Filter } from 'lucide-react';

export interface Project {
  _id: string;
  name: string;
  created_at: string;
}

type ExportItem = {
  name: string;
  content: string;
};
interface Template {
  _id: string;
  name: string;
  labels: string[];
}

interface ProjectWithLabels extends Project {
  templates: Template[];
}
export default function ProjectDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [open, setOpen] = useState(false);
  const [res, setRes] = useState([]);
  const [name, setName] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [exportItems, setExportItems] = useState<ExportItem[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [projectLabels, setProjectLabels] = useState<Record<string, string[]>>(
    {}
  );
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [availableLabels, setAvailableLabels] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);

  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();

  useEffect(() => {
    if (session) {
      if (session?.user?.role === 'annotator') router.push('/tasks');
      if (session?.user?.role === 'system admin') router.push('/admin/');
      fetch('/api/projects')
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setProjects(data.projects);
          }
        })
        .catch((error) =>
          toast({
            variant: 'destructive',
            title: 'Uh oh! Something went wrong.',
            description: error.message,
          })
        );
    }
  }, [session, router, toast]);

  useEffect(() => {
    if (session) {
      fetch('/api/projects?labels=true')
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            // Create a map of project IDs to their labels
            const labelMap: Record<string, string[]> = {};
            const allLabels = new Set<string>();

            data.projects.forEach((project: ProjectWithLabels) => {
              const projectLabels =
                project.templates?.flatMap((t) => t.labels || []) || [];
              labelMap[project._id] = [...new Set(projectLabels)];
              projectLabels.forEach((label) => allLabels.add(label));
            });

            setProjectLabels(labelMap);
            setAvailableLabels(Array.from(allLabels));
          }
        })
        .catch((error) =>
          toast({
            variant: 'destructive',
            title: 'Error loading project labels',
            description: error.message,
          })
        );
    }
  }, [session]);
  useEffect(() => {
    setFilteredProjects(getFilteredProjects());
  }, [selectedLabels, projects, projectLabels]);
  // Add this filtering function:
  const getFilteredProjects = () => {
    if (selectedLabels.length === 0) return projects;
    return projects.filter((project) =>
      selectedLabels.every((selectedLabel) =>
        projectLabels[project._id]?.includes(selectedLabel)
      )
    );
  };

  // Add the toggle label handler:
  const toggleLabel = (label: string) => {
    setSelectedLabels((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  if (!session) {
    return <Loader />;
  }

  const handleCheckboxChange = (itemName: string) => {
    setSelectedItems((prev) =>
      prev.includes(itemName)
        ? prev.filter((name) => name !== itemName)
        : [...prev, itemName]
    );
  };

  const handleProjectClick = (projectId: string) => {
    router.push(`/projects/${projectId}`);
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    fetch(`/api/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: newProjectName.trim() }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const error = await res.json();
          toast({
            variant: 'destructive',
            title: 'Uh oh! Something went wrong.',
            description: error.message,
          });
        } else {
          const data = await res.json();
          setProjects([...projects, data.project]);
          setFilteredProjects([...projects,data.project]);
          setNewProjectName('');
        }
      })
      .catch((error) =>
        toast({
          variant: 'destructive',
          title: 'Uh oh! Something went wrong.',
          description: error.message,
        })
      );
  };

  const handledownload = async (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    const res = JSON.parse(await getAllAcceptedTasks(project._id));
    if (res.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No submitted tasks found',
      });
      return;
    }
    const extractedElements = extractElementDetails(JSON.parse(res[0].content));
    setRes(res);
    setName(project.name);
    setExportItems(extractedElements);
    setOpen(true);
  };

  const handleExport = (format: string) => {
    const exportItems = parseAndAddSelectedItemsToArray(res, selectedItems);
    if (format === 'json') {
      const dataStr = JSON.stringify(exportItems, null, 2);
      const dataUri =
        'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

      const exportFileDefaultName = `${name}.json`;
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } else {
      jsonToCsvExport({ data: exportItems, filename: `${name}.csv` });
    }

    setOpen(false);
    setRes([]);
    setName('');
    setExportItems([]);
    setSelectedItems([]);
  };

  const handleDeleteProject = (e: React.MouseEvent, _id: string) => {
    e.stopPropagation();
    setProjectToDelete(_id);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteProject = () => {
    if (projectToDelete) {
      fetch(`/api/projects`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ _id: projectToDelete }),
      })
        .then(async (res) => {
          if (!res.ok) {
            const error = await res.json();
            toast({
              variant: 'destructive',
              title: 'Uh oh! Something went wrong.',
              description: error.message,
            });
          } else {
            setProjects(
              projects.filter((project) => project._id !== projectToDelete)
            );
            toast({
              title: 'Project deleted successfully',
            });
          }
        })
        .catch((error) =>
          toast({
            variant: 'destructive',
            title: 'Uh oh! Something went wrong.',
            description: error.message,
          })
        );
      setDeleteConfirmOpen(false);
      setProjectToDelete(null);
    }
  };

  if (session?.user?.role === 'project manager')
    return (
      <div className='min-h-screen '>
        <header className='bg-white '>
          <div className='max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center'>
            <h1 className='text-3xl font-bold text-gray-900 tracking-tight'>
              Project
            </h1>
            <Button
              variant='outline'
              onClick={() => setIsFilterOpen(true)}
              className='flex items-center'
            >
              <Filter className='mr-2 h-4 w-4' />
              Filter Labels
            </Button>
            <SheetMenu />
          </div>
        </header>
        <main className='max-w-7xl mx-auto  sm:px-6 lg:px-8'>
          <form onSubmit={handleCreateProject} className='mb-8'>
            <div className='flex gap-4'>
              <Input
                type='text'
                placeholder='New project name'
                required
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className='flex-grow'
              />
              <Button type='submit'>
                <PlusCircle className='mr-2 h-4 w-4' /> Create Project
              </Button>
            </div>
          </form>
          {projects.length === 0 ? (
            <div className='text-center py-10'>
              <h2 className='text-xl font-semibold text-gray-900'>
                No projects yet
              </h2>
              <p className='mt-2 text-gray-600'>
                Create your first project to get started!
              </p>
            </div>
          ) : (
            <div className='bg-white shadow-sm rounded-lg overflow-h_idden'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project Name</TableHead>
                    <TableHead>Labels</TableHead>

                    <TableHead>Created Date</TableHead>
                    <TableHead className='text-right'>Actions</TableHead>
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
                        <div className='flex flex-wrap gap-2'>
                          {projectLabels[project._id]?.map((label, idx) => (
                            <Badge
                              key={`${project._id}-${idx}`}
                              variant='secondary'
                              className='text-xs'
                            >
                              {label}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className='flex items-center text-sm text-gray-500'>
                          <CalendarIcon className='mr-2 h-4 w-4' />
                          {format(parseISO(project.created_at), 'PPP')}
                        </div>
                      </TableCell>
                      <TableCell className='text-right'>
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={(e) => handledownload(e, project)}
                        >
                          <FileDown className='h-4 w-4' />
                          <span className='sr-only'>download</span>
                        </Button>
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={(e) => handleDeleteProject(e, project._id)}
                        >
                          <Trash2Icon className='h-4 w-4' />
                          <span className='sr-only'>Delete</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogContent className='sm:max-w-[425px]'>
                    <DialogHeader>
                      <DialogTitle>Export Data</DialogTitle>
                      <DialogDescription>
                        Select the items you want to export. Click export when
                        you&apos;re done.
                      </DialogDescription>
                    </DialogHeader>
                    <div className='grid gap-4 py-4'>
                      {exportItems.map((item) => (
                        <div
                          className='flex items-center space-x-2'
                          key={item.name}
                        >
                          <Checkbox
                            id={item.name}
                            checked={selectedItems.includes(item.name)}
                            onCheckedChange={() =>
                              handleCheckboxChange(item.name)
                            }
                          />
                          <Label htmlFor={item.name}>{item.name}</Label>
                        </div>
                      ))}
                    </div>
                    <DialogFooter>
                      <Button
                        type='submit'
                        onClick={() => handleExport('csv')}
                        disabled={selectedItems.length === 0}
                      >
                        Export CSV
                      </Button>
                      <Button
                        type='submit'
                        onClick={() => handleExport('json')}
                        disabled={selectedItems.length === 0}
                      >
                        Export JSON
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </Table>
            </div>
          )}
        </main>
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this project? This action cannot
                be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant='outline'
                onClick={() => setDeleteConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button variant='destructive' onClick={confirmDeleteProject}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Filter by Labels</DialogTitle>
              <DialogDescription>
                Select labels to filter projects
              </DialogDescription>
            </DialogHeader>
            <div className='grid grid-cols-2 gap-4 py-4'>
              {availableLabels.map((label) => (
                <div key={label} className='flex items-center gap-2'>
                  <input
                    type='checkbox'
                    id={label}
                    checked={selectedLabels.includes(label)}
                    onChange={() => toggleLabel(label)}
                    className='rounded border-gray-300'
                  />
                  <Label htmlFor={label}>{label}</Label>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button onClick={() => setIsFilterOpen(false)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
}
