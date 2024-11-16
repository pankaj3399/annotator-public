"use client"

import { Annotator } from "@/app/(maneger)/projects/task/[projectId]/page"
import { getAllAnnotators } from "@/app/actions/annotator"
import { setTaskStatus } from "@/app/actions/task"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Check, UserPlus, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"

export type StatusType = 'pending' | 'accepted' | 'rejected' | 'reassigned'

export default function Dock({ id, status }: { id: string, status: StatusType }) {
  const [currentStatus, setCurrentStatus] = useState<StatusType>(status)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [showReassignDialog, setShowReassignDialog] = useState(false)
  const [feedback, setFeedback] = useState("")
  const [reassignTo, setReassignTo] = useState("")
  const [annotators, setAnnotators] = useState<Annotator[]>([])

  const router = useRouter()

  useEffect(() => {
    async function init() {
      setAnnotators(JSON.parse(await getAllAnnotators()))
    }
    init();
  }, []);

  const handleClick = async (action: StatusType) => {
    if (action === 'rejected') {
      setShowRejectDialog(true)
    } else if (action === 'reassigned') {
      setShowReassignDialog(true)
    } else {
      await updateStatus(action)
    }
  }

  const updateStatus = async (action: StatusType, additionalData?: any) => {
    try {
      const newStatus = await setTaskStatus(id, action, additionalData?.feedback, additionalData?.reassignTo)
      setCurrentStatus(newStatus)
      toast.success(`The task has been ${action}`)
      router.back()
    } catch (error) {
      toast.error(`Failed to ${action} the task`)
    }
  }

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault()
    await updateStatus('rejected', { feedback })
    setShowRejectDialog(false)
    setFeedback("")
  }

  const handleReassign = async () => {
    if (!reassignTo) {
      toast.error('Please select a annotator to reassign the task')
      return
    }
    await updateStatus('reassigned', { reassignTo })
    setShowReassignDialog(false)
    setReassignTo("")
  }

  const getButtonStyle = (action: StatusType) => {
    if (currentStatus === action && currentStatus !== 'pending') {
      return "bg-gray-100 text-gray-900 font-medium"
    }
    return "text-gray-600 hover:text-gray-900"
  }

  const getButtonContent = (action: string, icon: React.ReactNode) => {
    const displayText = currentStatus === action ?
      action.charAt(0).toUpperCase() + action.slice(1) + 'ed' :
      action.charAt(0).toUpperCase() + action.slice(1)

    return (
      <>
        {icon}
        {displayText}
      </>
    )
  }

  return (
    <>
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 border border-gray-200 rounded-full bg-white shadow-sm">
        <div className="flex items-center space-x-2 px-4 py-2">
          <Button
            variant="ghost"
            className={getButtonStyle('accepted')}
            onClick={() => handleClick('accepted')}
          >
            {getButtonContent('accept', <Check className="h-4 w-4 mr-2" />)}
          </Button>
          <div className="w-px h-6 bg-gray-200" />
          <Button
            variant="ghost"
            className={getButtonStyle('rejected')}
            onClick={() => handleClick('rejected')}
          >
            {getButtonContent('reject', <X className="h-4 w-4 mr-2" />)}
          </Button>
          <div className="w-px h-6 bg-gray-200" />
          <Button
            variant="ghost"
            className={getButtonStyle('reassigned')}
            onClick={() => handleClick('reassigned')}
          >
            {getButtonContent('reassign', <UserPlus className="h-4 w-4 mr-2" />)}
          </Button>
        </div>
      </div>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Provide Feedback</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleReject} >
            <div className="mb-4">
              <Label htmlFor="feedback" className="text-right">
                Feedback
              </Label>
              <Textarea
                id="feedback"
                value={feedback}
                placeholder="Provide feedback"
                required
                onChange={(e) => setFeedback(e.target.value)}
                className="col-span-3"
              />
            </div>
            <DialogFooter>
              <Button type="submit">Submit</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showReassignDialog} onOpenChange={setShowReassignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign Task</DialogTitle>
          </DialogHeader>
          <div className="">
            <Label htmlFor="reassignTo" className="text-right">
              Reassign to
            </Label>
            <Select onValueChange={setReassignTo} value={reassignTo}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a person" />
              </SelectTrigger>
              <SelectContent>
                    {annotators.map((user) => (
                      <SelectItem key={user._id} value={user._id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleReassign}>Reassign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}