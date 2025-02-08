'use client'

import { getTasksToReview } from "@/app/actions/task"
import { SheetMenu } from "@/components/admin-panel/sheet-menu"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import Loader from '@/components/ui/NewLoader/Loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { getStatusBadgeVariant } from "@/lib/constants"
import { formatTime } from "@/lib/utils"
import { format, parseISO } from "date-fns"
import { CalendarIcon, NotebookPen } from "lucide-react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export interface Task {
  _id: string
  name: string
  created_at: string
  status: 'pending' | 'accepted' | 'rejected' | 'reassigned'
  submitted: boolean
  timeTaken: number
  feedback?: string
}

export default function ReviewTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [dialog, setDialog] = useState(false)
  const [feedback, setFeedback] = useState('')
  const { data: session } = useSession()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    async function fetchTasks() {
      if (!session?.user?.id) return
      try {
        const tasksData = JSON.parse(await getTasksToReview())
        setTasks(tasksData)
      } catch (error) {
        console.error("Error fetching review tasks:", error)
        toast({
          variant: "destructive",
          title: "Error fetching tasks",
          description: "Failed to load tasks for review.",
        })
      } finally {
        setLoading(false)
      }
    }
    fetchTasks()
  }, [session])

  const handleClick = (e: React.MouseEvent, feedback: string) => {
    e.stopPropagation()
    setFeedback(feedback)
    setDialog(true)
  }

  if (loading) {
    return <Loader />
  }

  return (
    <div className="min-h-screen">
      <header className="bg-white">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Tasks to Review</h1>
          <SheetMenu />
        </div>
      </header>
      <main className="max-w-7xl mx-auto sm:px-6 lg:px-8">
        {tasks.length === 0 ? (
          <div className="text-center py-10">
            <h2 className="text-xl font-semibold text-gray-900">No tasks to review</h2>
            <p className="mt-2 text-gray-600">You'll see tasks here when they're assigned to you for review.</p>
          </div>
        ) : (
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task Name</TableHead>
                  <TableHead>Created Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Time Taken</TableHead>
                  <TableHead className="text-center">Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow
                    key={task._id}
                    onClick={() => router.push(`/task/${task._id}`)}
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    <TableCell className="font-medium">{task.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm text-gray-500">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(parseISO(task.created_at), 'PPP')}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      <Badge variant={getStatusBadgeVariant(task.status)}>
                        {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-center">
                      {formatTime(task.timeTaken)}
                    </TableCell>
                    <TableCell className="font-medium text-center">
                      <span role="img" aria-label={task.submitted ? "Submitted" : "Not submitted"}>
                        {task.submitted ? '✔️' : '❌'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {task.feedback && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleClick(e, task.feedback || '')}
                        >
                          <NotebookPen className="h-4 w-4" />
                          <span className="sr-only">feedback</span>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={dialog} onOpenChange={setDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Feedback</DialogTitle>
              <DialogDescription>
                {feedback}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-start">
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Close
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}