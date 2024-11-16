'use client'

import { aiSolve } from '@/app/actions/ai'
import { deleteCompletedJobs } from '@/app/actions/aiModel'
import { getAllTasks } from '@/app/actions/task'
import { Button } from "@/components/ui/button"
import useJobList from '@/hooks/use-jobList'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Task } from './page'

export default function TaskProgress({setTasks}:{setTasks: React.Dispatch<React.SetStateAction<Task[]>>}) {
  const [isRunning, setIsRunning] = useState(false)
  const { getJobs, getcompletedJobCount, setJobs, getUncompletedJobCount, deleteCompleted } = useJobList()
  const totalTasks = getJobs().length
  const pathName = usePathname();
  const projectId = pathName.split("/")[3];
  
  async function init() {
    const res = await fetch('/api/job?projectId=' + projectId).then(res => res.json())
    if (!res.success) {
      console.log(res.error)
      return
    }
    setJobs(res.models)
  }
  async function init2() {
    const res = await fetch('/api/job?projectId=' + projectId).then(res => res.json())
    if (!res.success) {
      console.log(res.error)
      return
    }
    setJobs(res.models)
    if(res.models.length == 0){
      setTasks(JSON.parse(await getAllTasks(projectId)))
      toast.success("Completed!")
      setIsRunning(false)
      return
    }
  }

  useEffect(() => {
    init()
  }, [projectId])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRunning && getcompletedJobCount() < totalTasks) {
      interval = setInterval(() => {
        init2()
      }, 3000)
    }
    return () => clearInterval(interval)
  }, [isRunning, getcompletedJobCount()])

  const handleRun = async () => {
    aiSolve(projectId)
    setIsRunning(true)
  }

  const getButtonText = () => {
    // if (totalTasks !== 0 && getcompletedJobCount() === totalTasks) {
    //   toast.success("Completed!")
    //   deleteCompletedJobs(projectId)
    //   deleteCompleted()
    //   setIsRunning(false)
    //   // return "Start AI Solving"
    // }
    if (isRunning) return `Processing... ${getcompletedJobCount()}/${totalTasks}`
    return `Start AI Solving ${getUncompletedJobCount()} Tasks`
  }

  return (
    <>
     { getUncompletedJobCount() > 0  && <Button
        onClick={handleRun}
        variant="outline"
        disabled={isRunning && getcompletedJobCount() < totalTasks}
        className={`transition-all duration-300 `}
        aria-live="polite"
        aria-busy={isRunning}
      >
        <span className="relative flex items-center justify-center">
          {isRunning && (
            <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {getButtonText()}
        </span>
      </Button>}
    </>
  )
}