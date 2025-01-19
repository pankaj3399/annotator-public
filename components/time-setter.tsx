'use client'

import { updateTimer } from "@/app/actions/template"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useEditor } from "@/providers/editor/editor-provider"
import { set } from "mongoose"
import { useEffect, useState, useRef, useCallback } from 'react'
import { toast } from "sonner"

export function TimeSetterComponent({ templateId }: { templateId: string }) {
  const { dispatch, state, subaccountId, funnelId, pageDetails } = useEditor()
  const time = pageDetails.timer
  const [hours, setHours] = useState(time ? Math.floor(time / 3600) : 0)
  const [minutes, setMinutes] = useState(time ? Math.floor((time % 3600) / 60) : 0)
  const [seconds, setSeconds] = useState(time ? time % 60 : 0)
  const [totalSeconds, setTotalSeconds] = useState(time ? time : 0)
  const [hasChanged, setHasChanged] = useState(false)
  const componentRef = useRef(null)

  useEffect(() => {
    const total = hours * 3600 + minutes * 60 + seconds
    setTotalSeconds(total)
    setHasChanged(true)
  }, [hours, minutes, seconds])

  const handleBlur = useCallback(async () => {
    if (hasChanged) {
      try {
        const total = hours * 3600 + minutes * 60 + seconds // Recalculate here
        await updateTimer(templateId, total)
        toast.success(`Timer set to ${hours} hr ${minutes} min ${seconds} sec`)
        setHasChanged(false)
      } catch (error) {
        toast.error('Failed to set timer')
      }
    }
  }, [hasChanged, hours, minutes, seconds, templateId])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (componentRef.current && !componentRef.current.contains(event.target)) {
        handleBlur()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [hours, minutes, seconds, hasChanged,handleBlur])

  return (
    <div ref={componentRef} className="flex items-center gap-4 mr-10">
      <div className="text-center">
        <h2 className="text-md">Set Timer</h2>
      </div>
      <div className="flex justify-center items-center space-x-4">
        <div className="flex items-center">
          <Input
            type="number"
            id="hours"
            min="0"
            value={hours}
            onChange={(e) => setHours(isNaN(parseInt(e.target.value)) ? 0 : parseInt(e.target.value))}
            className="w-16 text-center text-lg font-semibold h-10 mr-1"
          />
          <Label htmlFor="hours" className="text-sm font-medium text-gray-700">hr</Label>
        </div>
        <div className="flex items-center">
          <Input
            type="number"
            id="minutes"
            min="0"
            max="59"
            value={minutes}
            onChange={(e) => setMinutes(isNaN(parseInt(e.target.value)) ? 0 : parseInt(e.target.value))}
            className="w-16 text-center text-lg font-semibold h-10 mr-1"
          />
          <Label htmlFor="minutes" className="text-sm font-medium text-gray-700">min</Label>
        </div>
        <div className="flex items-center">
          <Input
            type="number"
            id="seconds"
            min="0"
            max="59"
            value={seconds}
            onChange={(e) => setSeconds(isNaN(parseInt(e.target.value)) ? 0 : parseInt(e.target.value))}
            className="w-16 text-center text-lg font-semibold h-10 mr-1"
          />
          <Label htmlFor="seconds" className="text-sm font-medium text-gray-700">sec</Label>
        </div>
      </div>
    </div>
  )
}