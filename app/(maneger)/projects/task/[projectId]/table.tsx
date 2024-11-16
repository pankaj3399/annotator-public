import { addJob, deleteJobByTaskid } from "@/app/actions/aiModel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import useJobList from "@/hooks/use-jobList"
import { getStatusBadgeVariant } from "@/lib/constants"
import { formatTime } from "@/lib/utils"
import { format, parseISO } from "date-fns"
import { CalendarIcon, NotebookPen, Trash2Icon } from "lucide-react"
import { usePathname } from "next/navigation"
import { useEffect, useState } from 'react'
import { toast } from "sonner"
import { Judge } from "../../ai-config/[projectId]/page"
import { Annotator, Task } from "./page"
interface TaskTableProps {
    tasks: Task[]
    setTasks: React.Dispatch<React.SetStateAction<Task[]>>
    annotators: Annotator[]
    judges: Judge[]
    handleAssignUser: (annotatorId: string, taskId: string, ai: boolean) => void
    handleDeleteTemplate: (e: React.MouseEvent, _id: string) => void
    router: any
}

export function TaskTable({ tasks, setTasks, annotators,judges, handleAssignUser, handleDeleteTemplate, router }: TaskTableProps) {
    const [dialog, setDialog] = useState(false)
    const [feedback, setFeedback] = useState('')
    const { setJob, getJobs, removeJobByTaskid } = useJobList()
    const pathName = usePathname();
    const projectId = pathName.split("/")[3];
    function handleclick(e: React.MouseEvent, feedback: string) {
        e.stopPropagation()
        setFeedback(feedback)
        setDialog(true)
    }

    function updateTasks(): Task[] { // Create a set of task IDs from jobs where completed is true 
        const completedTaskIds = new Set(getJobs().filter(job => job.completed).map(job => job.taskid)); // Loop through the tasks and update the submitted status 
        return tasks.map(task => {
            if (completedTaskIds.has(task._id)) {
                return { ...task, submitted: true };
            }
            return task;
        });
    }

    useEffect(() => {
        setTasks(updateTasks());
    }, [getJobs()])


    return (
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Tasks Name</TableHead>
                        <TableHead>Created Date</TableHead>
                        <TableHead>Assignee</TableHead>
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
                            <TableCell>
                                <Select
                                    value={task.ai ? task.ai : task.annotator == null? "" : task.annotator}
                                    onValueChange={async (value) => {
                                        const exist = judges.find((judge) => judge._id === value)
                                        if (exist) {
                                            if(getJobs().some((job) => job.taskid == task._id) ){
                                                const res = await deleteJobByTaskid(task._id)
                                                if (res.error) {
                                                    toast.error(res.error)
                                                    return
                                                }
                                                removeJobByTaskid(task._id)
                                            }
                                            const res = await addJob(value, task._id, projectId)
                                            if (res.error) {
                                                toast.error(res.error)
                                                return
                                            }
                                            setJob(JSON.parse(res.model as string))
                                            handleAssignUser(value, task._id, true)
                                        } else {
                                            if(getJobs().some((job) => job.taskid == task._id) ){
                                                const res = await deleteJobByTaskid(task._id)
                                                if (res.error) {
                                                    toast.error(res.error)
                                                    return
                                                }
                                                removeJobByTaskid(task._id)
                                            }
                                            handleAssignUser(value, task._id, false)
                                        }
                                    }}
                                >
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Assign user" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {judges.length > 0 && judges.map((judge) => (
                                            <SelectItem key={judge._id} value={judge._id}>
                                                {judge.name}
                                            </SelectItem>
                                        ))}
                                        {annotators.map((user) => (
                                            <SelectItem key={user._id} value={user._id}>
                                                {user.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
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
                                {task.feedback && <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => handleclick(e, task.feedback)}
                                >
                                    <NotebookPen className="h-4 w-4" />
                                    <span className="sr-only">feedback</span>
                                </Button>}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => handleDeleteTemplate(e, task._id)}
                                >
                                    <Trash2Icon className="h-4 w-4" />
                                    <span className="sr-only">Delete</span>
                                </Button>
                            </TableCell>
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