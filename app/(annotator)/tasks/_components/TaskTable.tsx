'use client'
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getStatusBadgeVariant } from "@/lib/constants"
import { format, parseISO } from "date-fns"
import { CalendarIcon, NotebookPen, Trash2Icon } from "lucide-react"
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { task } from "../all/page"

export default function TaskTable({ tasks }: { tasks: task[] }) {
  const [dialog, setDialog] = useState(false)
  const [feedback, setFeedback] = useState('')
  function handleclick(e: React.MouseEvent, feedback: string) {
    e.stopPropagation()
    setFeedback(feedback)
    setDialog(true)
  }
  const router = useRouter();
  return (
    <div className="bg-white shadow-sm rounded-lg overflow-h_idden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tasks Name</TableHead>
            <TableHead>Created Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-center">Feedback</TableHead>
            <TableHead className="text-center">Submitted</TableHead>
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
              <TableCell className="text-center">
                {task.feedback ? <Button
                  variant="ghost"
                  size="sm"

                  onClick={(e) => handleclick(e, task.feedback)}
                >
                  <NotebookPen className="h-4 w-4" />
                  <span className="sr-only">feedback</span>
                </Button>: "no feedback"}
              </TableCell>
              <TableCell className="font-medium text-center">{task.submitted ? '✔️' : '❌'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
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
      </Table>
    </div>
  )
}