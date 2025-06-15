import { ImageIcon, TagIcon } from 'lucide-react'
import React from 'react'

const DynamicImageAnnotationPlaceholder = () => {
  const handleDragStart = (e: React.DragEvent, type: string) => {
    if (type === null) return
    e.dataTransfer.setData('componentType', type)
  }
  
  return (
    <div
      draggable
      onDragStart={(e) => handleDragStart(e, 'dynamicImageAnnotation')}
      className="h-14 w-14 bg-muted rounded-lg flex items-center justify-center cursor-grab hover:bg-muted/80"
    >
      <div className="relative">
        <ImageIcon size={24} className="text-muted-foreground" />
        <TagIcon size={12} className="absolute -top-1 -right-1 text-blue-500" />
        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xs font-bold">D</span>
        </div>
      </div>
    </div>
  )
}

export default DynamicImageAnnotationPlaceholder