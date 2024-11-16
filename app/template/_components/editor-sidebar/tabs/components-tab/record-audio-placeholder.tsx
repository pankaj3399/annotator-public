import { EditorBtns } from '@/lib/constants'
import { AudioLinesIcon, Image, Mic } from 'lucide-react'
import React from 'react'


const RecordAudioPlaceholder = () => {
  const handleDragStart = (e: React.DragEvent, type: EditorBtns) => {
    if (type === null) return
    e.dataTransfer.setData('componentType', type)
  }
  return (
    <div
      draggable
      onDragStart={(e) => handleDragStart(e, 'recordAudio')}
      className="h-14 w-14 bg-muted rounded-lg flex items-center justify-center"
    >
      <Mic
        size={40}
        className="text-muted-foreground"
      />
    </div>
  )
}

export default RecordAudioPlaceholder
