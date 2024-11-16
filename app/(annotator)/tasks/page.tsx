'use client'
import { getDistinctProjectsByAnnotator } from "@/app/actions/task"
import { SheetMenu } from "@/components/admin-panel/sheet-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Loader from '@/components/ui/Loader/Loader'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { format, parseISO } from "date-fns"
import { CalendarIcon, PlusCircle, Trash2Icon } from "lucide-react"
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export interface Project {
  _id: string
  name: string
  created_at: string
}

export default function ProjectDashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast()

  useEffect(() => {
    getDistinctProjectsByAnnotator().then(projects => {
      setProjects(JSON.parse(projects))
      setFilteredProjects(JSON.parse(projects))
    })
      .catch((error) => {
        console.error('Error fetching projects:', error);
      });
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);

    const filtered = projects.filter((project) =>
      project.name.toLowerCase().includes(query)
    );
    setFilteredProjects(filtered); // Update the filtered list of projects
  };

  if (!session) {
    return <Loader />;
  }

  const handleProjectClick = (project_id: string) => {
    router.push(`/tasks/${project_id}`);
  };

  return (
    <div className="min-h-screen ">
      <header className="bg-white ">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Project</h1>
          <SheetMenu />
        </div>
      </header>
      <main className="max-w-7xl mx-auto  sm:px-6 lg:px-8">
        <form onSubmit={(e) => e.preventDefault()} className="mb-8">
          <div className="flex gap-4">
            <Input
              type="text"
              placeholder="Search projects"
              required
              value={searchQuery}
              onChange={handleSearchChange}
              className="flex-grow"
            />
            {/* <Button type="submit">
              <PlusCircle className="mr-2 h-4 w-4" /> Create Project
            </Button> */}
          </div>
        </form>
        {filteredProjects.length === 0 ? (
          <div className="text-center py-10">
            <h2 className="text-xl font-semibold text-gray-900">No projects yet</h2>
            <p className="mt-2 text-gray-600">No projects have been assigned to you</p>
          </div>
        ) : (
          <div className="bg-white shadow-sm rounded-lg overflow-h_idden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project Name</TableHead>
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
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center text-sm text-gray-500">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(parseISO(project?.created_at), 'PPP')}

                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>
    </div>
  )
}