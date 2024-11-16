'use client'
import { getTask } from '@/app/actions/task'
import Dock, { StatusType } from '@/components/review-dock'
import Loader from '@/components/ui/Loader/Loader'
import { toast } from '@/hooks/use-toast'
import EditorProvider from '@/providers/editor/editor-provider'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Editor from './editor'
import Timer from '@/components/floating-timer-submit'
import useStatus from '@/hooks/use-status'

export interface task  {
  _id: string
  name: string
  project: string
  created_at: string
  content: string
  status: StatusType
  submitted: boolean
}

const Page = () => {
  const router = useRouter()
  const pathName = usePathname();
  const taskid = pathName.split("/")[2];
  const [task, setTask] = useState<task>()
  const [loading, setLoading] = useState(true)
  const { data: session } = useSession();
  const { setStatus,setSubmitted } = useStatus();


  useEffect(() => {
    const fetchData = async () => {
      try {
        const task: task = JSON.parse(await getTask(taskid))
        setTask(task)
        setLoading(false)
        setStatus(task.status)
        setSubmitted(task.submitted)
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message })
        router.back()
      }
    }
    fetchData()
  }, [taskid,router])

  if (loading) {
    return <Loader />
  }

  if (task == undefined) {
    toast({ variant: 'destructive', title: 'Error', description: 'Something went wrong' })
    router.back()
    return null
  }

  return (
    <EditorProvider
      subaccountId={task.project}
      funnelId={taskid}
      pageDetails={task}
    >
      <Editor pageId={taskid} liveMode={true} />
      {session?.user?.role === 'project manager' && <Dock id={taskid} status={task.status} />}
      {session?.user?.role === 'annotator'&& !task.submitted &&  ( task.status !=='accepted') && <Timer />}
    </EditorProvider>
  )
}

export default Page

