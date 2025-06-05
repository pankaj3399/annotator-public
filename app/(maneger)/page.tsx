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
import Loader from '@/components/ui/NewLoader/Loader';
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
import {
  CalendarIcon,
  FileDown,
  FileText,
  Filter,
  PlusCircle,
  Trash2Icon,
  Search,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getAllAcceptedTasks } from '../actions/task';
import {
  extractElementDetails,
  parseAndAddSelectedItemsToArray,
} from './export';
import { Badge } from '@/components/ui/badge';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface Project {
  _id: string;
  name: string;
  created_at: string;
  labels: string[];
}

type ExportItem = {
  name: string;
  content: string;
};
interface Template {
  _id: string;
  name: string;
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
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [createProjectDialogOpen, setCreateProjectDialogOpen] = useState(false);

  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { toast } = useToast();

  // Get pagination parameters from URL
  useEffect(() => {
    const page = searchParams.get('page');
    const size = searchParams.get('size');
    const search = searchParams.get('search');

    if (page) {
      setCurrentPage(Number(page));
    }

    if (size) {
      setPageSize(Number(size));
    }

    if (search) {
      setSearchTerm(search);
    }
  }, [searchParams]);

  useEffect(() => {
    if (session) {
      if (session?.user?.role === 'annotator') router.push('/tasks');
      if (session?.user?.role === 'system admin') router.push('/admin/');
      if (session?.user?.role === 'agency owner') router.push('/agencyOwner');
      if (session?.user?.role === 'data scientist')
        router.push('/dataScientist/dashboard');

      setIsLoading(true);
      fetch('/api/projects')
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setProjects(data.projects);
          }
          setIsLoading(false);
        })
        .catch((error) => {
          toast({
            variant: 'destructive',
            title: 'Uh oh! Something went wrong.',
            description: error.message,
          });
          setIsLoading(false);
        });
    }
  }, [session, router, toast]);

  useEffect(() => {
    if (session) {
      setIsLoading(true);
      fetch('/api/projects')
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            // Use project labels directly
            const labelMap: Record<string, string[]> = {};
            const allLabels = new Set<string>();

            data.projects.forEach((project: Project) => {
              labelMap[project._id] = project.labels || [];
              project.labels?.forEach((label) => allLabels.add(label));
            });

            setProjectLabels(labelMap);
            setAvailableLabels(Array.from(allLabels));
            setProjects(data.projects);
          }
          setIsLoading(false);
        })
        .catch((error) => {
          toast({
            variant: 'destructive',
            title: 'Error loading project labels',
            description: error.message,
          });
          setIsLoading(false);
        });
    }
  }, [session]);

  useEffect(() => {
    setFilteredProjects(getFilteredProjects());
  }, [selectedLabels, projects, projectLabels, searchTerm]);

  useEffect(() => {
    // Clear any stored project ID when on the main projects listing page
    if (typeof window !== 'undefined') {
      try {
        console.log('On all projects page, clearing stored project ID');
        localStorage.removeItem('currentProjectId');
      } catch (e) {
        console.error('Error accessing localStorage:', e);
      }
    }
  }, [pathname, session]);

  // Enhanced filtering function with search
  const getFilteredProjects = () => {
    let filtered = projects;

    // Filter by labels
    if (selectedLabels.length > 0) {
      filtered = filtered.filter((project) => {
        if (!project.labels) return false;
        return selectedLabels.every((selectedLabel) =>
          project.labels.includes(selectedLabel)
        );
      });
    }

    // Filter by search term
    if (searchTerm.trim()) {
      filtered = filtered.filter(
        (project) =>
          project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          project.labels?.some((label) =>
            label.toLowerCase().includes(searchTerm.toLowerCase())
          )
      );
    }

    return filtered;
  };

  // Handle page changes
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`?${params.toString()}`);
  };

  // Handle page size changes
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', '1');
    params.set('size', newSize.toString());
    router.push(`?${params.toString()}`);
  };

  // Handle search changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', '1');
    if (value.trim()) {
      params.set('search', value);
    } else {
      params.delete('search');
    }
    router.push(`?${params.toString()}`);
  };

  // Calculate pagination values
  const totalPages = Math.ceil(filteredProjects.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentPageProjects = filteredProjects.slice(startIndex, endIndex);

  const fetchProjects = async (labels: string[] = []) => {
    try {
      setIsLoading(true);
      const queryParams = new URLSearchParams();

      if (labels.length > 0) {
        queryParams.append('labels', labels.join(','));
      }

      const res = await fetch(`/api/projects?${queryParams}`);
      const data = await res.json();

      if (data.success) {
        setProjects(data.projects);

        // Collect all unique labels from projects
        const allLabels = new Set<string>();
        data.projects.forEach((project: Project) => {
          project.labels?.forEach((label) => allLabels.add(label));
        });
        setAvailableLabels(Array.from(allLabels));
      }
      setIsLoading(false);
    } catch (error: unknown) {
      // Properly type the error and provide a fallback message
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred';
      toast({
        variant: 'destructive',
        title: 'Error loading projects',
        description: errorMessage,
      });
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchProjects();
    }
  }, [session]);

  const toggleLabel = (label: string) => {
    const newLabels = selectedLabels.includes(label)
      ? selectedLabels.filter((l) => l !== label)
      : [...selectedLabels, label];

    setSelectedLabels(newLabels);
    fetchProjects(newLabels);
  };

  if (!session || isLoading) {
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
    router.push(`/projects/pipeline/${projectId}`);
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
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
          setFilteredProjects([...projects, data.project]);
          setNewProjectName('');
          setCreateProjectDialogOpen(false); // Close the dialog
          toast({
            title: 'Project created successfully',
          });
        }
        setIsLoading(false);
      })
      .catch((error) => {
        toast({
          variant: 'destructive',
          title: 'Uh oh! Something went wrong.',
          description: error.message,
        });
        setIsLoading(false);
      });
  };

  const handledownload = async (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    setIsLoading(true);
    try {
      const res = JSON.parse(await getAllAcceptedTasks(project._id));
      if (res.length === 0) {
        toast({
          variant: 'destructive',
          title: 'No submitted tasks found',
        });
        setIsLoading(false);
        return;
      }
      const extractedElements = extractElementDetails(
        JSON.parse(res[0].content)
      );
      setRes(res);
      setName(project.name);
      setExportItems(extractedElements);
      setOpen(true);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error downloading project data',
        description:
          error instanceof Error ? error.message : 'An unknown error occurred',
      });
    } finally {
      setIsLoading(false);
    }
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
      setIsLoading(true);
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
          setIsLoading(false);
        })
        .catch((error) => {
          toast({
            variant: 'destructive',
            title: 'Uh oh! Something went wrong.',
            description: error.message,
          });
          setIsLoading(false);
        });
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
            <div className='flex gap-2 items-center'>
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
          </div>
        </header>
        <main className='max-w-7xl mx-auto  sm:px-6 lg:px-8'>
          {/* UPDATED: Replace form with button */}
          <div className='flex w-full items-end justify-end mb-8 '>
            <Button
              onClick={() => setCreateProjectDialogOpen(true)}
              disabled={isLoading}
            >
              <PlusCircle className='mr-2 h-4 w-4' /> Create Project
            </Button>
          </div>

          {/* Search and Controls */}
          <div className='mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between'>
            <div className='relative flex-1 max-w-md'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4' />
              <Input
                type='text'
                placeholder='Search projects by name or labels...'
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className='pl-10'
              />
            </div>

            <div className='flex items-center space-x-2'>
              <span className='text-sm font-medium'>Rows per page:</span>
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => handlePageSizeChange(parseInt(value))}
              >
                <SelectTrigger className='w-20'>
                  <SelectValue>{pageSize}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 20, 50].map((size) => (
                    <SelectItem key={size} value={size.toString()}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {projects.length === 0 ? (
            <div className='text-center py-10'>
              <h2 className='text-xl font-semibold text-gray-900'>
                No projects yet
              </h2>
              <p className='mt-2 text-gray-600'>
                Create your first project to get started!
              </p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className='text-center py-10'>
              <h2 className='text-xl font-semibold text-gray-900'>
                No projects found
              </h2>
              <p className='mt-2 text-gray-600'>
                Try adjusting your search or filter criteria.
              </p>
              <Button
                variant='outline'
                className='mt-4'
                onClick={() => {
                  setSearchTerm('');
                  setSelectedLabels([]);
                  handleSearchChange('');
                }}
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <div className='bg-white shadow-sm rounded-lg overflow-hidden'>
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
                  {currentPageProjects.map((project) => (
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
                          {project.labels?.map((label, idx) => (
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
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent row click
                            router.push(`/projects/${project._id}/guidelines`);
                          }}
                        >
                          <FileText className='h-4 w-4' />
                          <span className='sr-only'>guidelines</span>
                        </Button>
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={(e) => handledownload(e, project)}
                          disabled={isLoading}
                        >
                          <FileDown className='h-4 w-4' />
                          <span className='sr-only'>download</span>
                        </Button>
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={(e) => handleDeleteProject(e, project._id)}
                          disabled={isLoading}
                        >
                          <Trash2Icon className='h-4 w-4' />
                          <span className='sr-only'>Delete</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination Footer */}
              <div className='flex flex-col space-y-4 border-t p-4'>
                <div className='flex justify-between w-full'>
                  <div className='text-sm text-muted-foreground'>
                    Showing {filteredProjects.length > 0 ? startIndex + 1 : 0}-
                    {Math.min(endIndex, filteredProjects.length)} of{' '}
                    {filteredProjects.length} projects
                  </div>
                </div>

                {totalPages > 1 && (
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href={`?page=${currentPage - 1}`}
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage > 1)
                              handlePageChange(currentPage - 1);
                          }}
                          className={
                            currentPage === 1
                              ? 'pointer-events-none opacity-50'
                              : ''
                          }
                        />
                      </PaginationItem>

                      {[...Array(totalPages)].map((_, index) => {
                        const pageNumber = index + 1;
                        if (
                          pageNumber === 1 ||
                          pageNumber === totalPages ||
                          (pageNumber >= currentPage - 1 &&
                            pageNumber <= currentPage + 1)
                        ) {
                          return (
                            <PaginationItem key={pageNumber}>
                              <PaginationLink
                                href={`?page=${pageNumber}`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  handlePageChange(pageNumber);
                                }}
                                isActive={pageNumber === currentPage}
                              >
                                {pageNumber}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        } else if (
                          pageNumber === currentPage - 2 ||
                          pageNumber === currentPage + 2
                        ) {
                          return <PaginationEllipsis key={pageNumber} />;
                        }
                        return null;
                      })}

                      <PaginationItem>
                        <PaginationNext
                          href={`?page=${currentPage + 1}`}
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage < totalPages)
                              handlePageChange(currentPage + 1);
                          }}
                          className={
                            currentPage === totalPages
                              ? 'pointer-events-none opacity-50'
                              : ''
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </div>
            </div>
          )}
        </main>

        <Dialog
          open={createProjectDialogOpen}
          onOpenChange={setCreateProjectDialogOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Enter a name for your new project.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateProject}>
              <div className='grid gap-4 py-4'>
                <div className='grid grid-cols-4 items-center gap-4'>
                  <Label htmlFor='projectName' className='text-right'>
                    Name
                  </Label>
                  <Input
                    id='projectName'
                    type='text'
                    placeholder='Enter project name'
                    required
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
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
                    setCreateProjectDialogOpen(false);
                    setNewProjectName('');
                  }}
                >
                  Cancel
                </Button>
                <Button type='submit' disabled={isLoading}>
                  {isLoading ? (
                    <span className='flex items-center'>Creating...</span>
                  ) : (
                    'Create Project'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Export Dialog */}
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
                <div className='flex items-center space-x-2' key={item.name}>
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

        {/* Delete Confirmation Dialog */}
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

        {/* Filter Labels Dialog */}
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
