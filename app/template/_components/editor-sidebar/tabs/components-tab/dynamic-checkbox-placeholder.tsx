import { EditorBtns } from '@/lib/constants'
import { CopyCheckIcon } from 'lucide-react'
import React from 'react'


const DynamicCheckboxPlaceholder = () => {
  const handleDragState = (e: React.DragEvent, type: EditorBtns) => {
    if (type === null) return
    e.dataTransfer.setData('componentType', type)
  }

  return (
    <div
      draggable
      onDragStart={(e) => {
        handleDragState(e, 'dynamicCheckbox')
      }}
      className=" h-14 w-14 bg-muted rounded-lg flex items-center justify-center"
    >
      <CopyCheckIcon
        size={40}
        className="text-muted-foreground"
      />
    </div>
  )
}

export default DynamicCheckboxPlaceholder
