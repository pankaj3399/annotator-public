import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CalendarIcon, Edit2Icon, Trash2Icon } from "lucide-react"

interface Project {
  id: string
  name: string
  createdAt: Date
}

interface ProjectCardProps {
  project: Project
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

export function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">{project.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="flex items-center text-sm text-gray-500">
          <CalendarIcon className="mr-2 h-4 w-4" />
          Created on: {project.createdAt.toLocaleDateString()}
        </div>
      </CardContent>
      <CardFooter className="flex justify-end space-x-2">
        <Button variant="outline" size="sm" onClick={() => onEdit(project.id)}>
          <Edit2Icon className="mr-2 h-4 w-4" />
          Edit
        </Button>
        <Button variant="outline" size="sm" onClick={() => onDelete(project.id)}>
          <Trash2Icon className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </CardFooter>
    </Card>
  )
}