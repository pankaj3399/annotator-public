'use client'

import { EditorBtns } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { EditorElement, useEditor } from '@/providers/editor/editor-provider'
import clsx from 'clsx'
import { Trash, Settings, X } from 'lucide-react'
import React, { useState, useRef, useEffect } from 'react'
import ReactPlayer from 'react-player'
import PropertyPanel from '@/app/template/_components/editor/editor-components/propertypanel'

type Props = {
  element: EditorElement
}

const DynamicVideoComponent = (props: Props) => {
  const { dispatch, state } = useEditor()
  // Local state to track if settings panel is visible for this specific element
  const [showSettings, setShowSettings] = useState(false)
  // Refs to detect clicks outside
  const componentRef = useRef<HTMLDivElement>(null)
  
  const [elementContent, setElementContent] = React.useState({
    src: !Array.isArray(props.element.content) ? props.element.content?.src || '' : ''
  })

  React.useEffect(() => {
    setElementContent({
      src: !Array.isArray(props.element.content) ? props.element.content?.src || '' : ''
    })
  }, [props.element])

  // Handle clicks outside the component to maintain selection
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Only handle this logic if settings are showing
      if (!showSettings) return;
      
      // Check if the click was outside our component
      if (componentRef.current && !componentRef.current.contains(event.target as Node)) {
        // Close settings when clicking outside the entire component
        setShowSettings(false);
      }
    };

    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);
    
    // Clean up
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettings]);

  const handleDragStart = (e: React.DragEvent, type: EditorBtns) => {
    if (type === null) return
    e.dataTransfer.setData('componentType', type)
  }

  const handleOnClickBody = (e: React.MouseEvent) => {
    e.stopPropagation()
    dispatch({
      type: 'CHANGE_CLICKED_ELEMENT',
      payload: {
        elementDetails: props.element,
      },
    })
  }

  const handleDeleteElement = (e: React.MouseEvent) => {
    e.stopPropagation()
    dispatch({
      type: 'DELETE_ELEMENT',
      payload: { elementDetails: props.element },
    })
  }

  const handleToggleSettings = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent the click from bubbling
    
    // First select the element
    dispatch({
      type: 'CHANGE_CLICKED_ELEMENT',
      payload: {
        elementDetails: props.element,
      },
    })
    
    // Toggle settings visibility
    setShowSettings(prev => !prev)
  }

  // Handle clicks on the property panel to prevent closing
  const handlePropertyPanelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Ensure element stays selected
    dispatch({
      type: 'CHANGE_CLICKED_ELEMENT',
      payload: {
        elementDetails: props.element,
      },
    });
  };

  const isSelected = state.editor.selectedElement.id === props.element.id
  const isLiveMode = state.editor.liveMode

  const defaultWidth = props.element.styles?.width || '560px'
  const defaultHeight = props.element.styles?.height || '315px'

  return (
    <div
      ref={componentRef}
      style={props.element.styles}
      draggable
      onDragStart={(e) => handleDragStart(e, 'dynamicVideo')}
      onClick={handleOnClickBody}
      className={clsx(
        'p-[2px] w-full m-[5px] relative text-[16px] transition-all flex items-center justify-center',
        {
          '!border-blue-500': isSelected,
          '!border-solid': isSelected,
          'border-dashed border-[1px] border-slate-300': !isLiveMode,
        }
      )}
    >
      {isSelected && !isLiveMode && (
        <div className="absolute -top-[25px] right-[0px]">
          <div className="bg-primary px-2.5 py-1 text-xs font-bold rounded-t-lg !text-white flex items-center gap-2">
            <Settings
              className={clsx("cursor-pointer hover:text-blue-200", {
                "text-blue-200": showSettings
              })}
              size={16}
              onClick={handleToggleSettings}
            />
            <Trash
              className="cursor-pointer hover:text-red-200"
              size={16}
              onClick={handleDeleteElement}
            />
          </div>
        </div>
      )}

      {isLiveMode ? (
        <ReactPlayer
          url={elementContent.src}
          width={defaultWidth}
          height={defaultHeight}
          className="max-w-full"
        />
      ) : (
        <div className={cn('w-fit h-fit bg-muted rounded-lg p-2')}>
          <div className="mb-2 text-sm text-muted-foreground">Video will be here</div>
          <ReactPlayer
            url={elementContent.src}
            width={defaultWidth}
            height={defaultHeight}
            className="max-w-full"
          />
        </div>
      )}

      {/* Inline Property Panel */}
      {isSelected && showSettings && !isLiveMode && (
        <div 
          className="absolute left-0 right-0 mt-2 z-50 bg-white border rounded-md shadow-lg"
          onClick={handlePropertyPanelClick}
        >
          <div className="flex items-center justify-between p-3 border-b">
            <h3 className="font-medium">Video Settings</h3>
            <button 
              onClick={handleToggleSettings}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <X size={16} />
            </button>
          </div>
          <div className="p-4">
            <PropertyPanel />
          </div>
        </div>
      )}
    </div>
  )
}

export default DynamicVideoComponent