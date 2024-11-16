import { EditorBtns } from '@/lib/constants'
import { Camera } from 'lucide-react'
import React from 'react'


const RecordVideoPlaceholder = () => {
  const handleDragStart = (e: React.DragEvent, type: EditorBtns) => {
    if (type === null) return
    e.dataTransfer.setData('componentType', type)
  }
  return (
    <div
      draggable
      onDragStart={(e) => handleDragStart(e, 'recordVideo')}
      className="h-14 w-14 bg-muted rounded-lg flex items-center justify-center"
    >
      <Camera
        size={40}
        className="text-muted-foreground"
      />
    </div>
  )
}

export default RecordVideoPlaceholder
