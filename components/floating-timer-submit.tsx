"use client"

import { updateTask } from '@/app/actions/task'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import useTimer from '@/hooks/use-timer'
import { toast } from '@/hooks/use-toast'
import { formatTime } from '@/lib/utils'
import { useEditor } from '@/providers/editor/editor-provider'
import { PauseIcon, PlayIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function Timer() {
  const { dispatch, state, subaccountId, funnelId, pageDetails } = useEditor()
  const { inc, running, setRunning } = useTimer()
  const [time, setTime] = useState(0)
  const [countdown, setCountdown] = useState(pageDetails.timer || 0)
  const [isRed, setIsRed] = useState(false)

  const router = useRouter()

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (running) {
      interval = setInterval(() => {
        setTime((prevTime) => prevTime + 1)
        inc(1)
        if (countdown > 0) {
          setCountdown((prevCountdown: number) => {
            const newCountdown = prevCountdown - 1
            if (newCountdown <= pageDetails.timer / 2) {
              setIsRed(true)
            }
            return newCountdown
          })
        }
      }, 1000)
    } else if (interval) {
      clearInterval(interval)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [running, countdown, pageDetails.timer])

  useEffect(() => {
    if (!running) {
      toggleTimer()
    }
  }, [])

  const toggleTimer = () => {
    setRunning(!running)
  }

  const handleSubmit = async () => {
    if (!state.editor.liveMode) return
    setRunning(false)
    for (const input of state.editor.elements[0].content) {
      switch (input.type) {
        case 'inputText':
          if (!input.content.innerText || input.content.innerText.trim() === "") {
            toast({
              variant: 'destructive',
              title: 'Submission Failed',
              description: 'input is empty',
            })
            setRunning(true)
            return; 
          }
          break;
        case 'checkbox':
          if (!input.content.selectedCheckbox || input.content.selectedCheckbox.length === 0) {
            toast({
              variant: 'destructive',
              title: 'Submission Failed',
              description: 'Please select at least one checkbox',
            }) 
            setRunning(true)           
            return; 
          }
          break;
        case 'inputRecordAudio':
        case 'inputRecordVideo':
          if (!input.content.src || input.content.src.trim() === "") {
            toast({
              variant: 'destructive',
              title: 'Submission Failed',
              description: 'Please submit the recording',
            })
            setRunning(true)                  
            return; 
          }
          break;
        default:
          continue;
      }
    }
    const content = JSON.stringify(state.editor.elements)
    try {
      await updateTask({
        ...pageDetails,
        status:'pending',
        feedback: '',
        content,
      }, funnelId,subaccountId, time)
      toast({
        title: 'Success',
        description: 'Successfully submitted',
      })
      router.back()
    } catch (error) {
      console.log(error)
      toast({
        variant: 'destructive',
        title: 'Failed',
        description: 'submission failed',
      })
    }
  }

  return (
    <div className="fixed bottom-4 left-[50%] translate-x-[-50%] z-50">
      <Card className="p-3 bg-white border border-gray-200 shadow-lg rounded-full hover:shadow-xl transition-shadow duration-300">
        <div className="flex items-center space-x-3">
          <div className={`text-2xl font-bold font-mono ${isRed ? 'text-red-500' : 'text-black'}`}>
            {pageDetails.timer > 0 ? formatTime(countdown) : formatTime(time)}
          </div>
          <Button
            onClick={toggleTimer}
            variant="outline"
            size="icon"
            className="bg-white hover:bg-gray-100 text-black border-gray-200 rounded-full"
          >
            {running ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={pageDetails.submitted}
            variant="outline"
            className="bg-white hover:bg-gray-100 text-black border-gray-200 rounded-full px-4 py-2 flex items-center space-x-2"
            aria-label="Submit time"
          >
            <span>Submit</span>
          </Button>
        </div>
      </Card>
    </div>
  )
}