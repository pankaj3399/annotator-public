'use client'

import { EditorBtns, defaultStyles } from '@/lib/constants'
import { EditorElement, useEditor } from '@/providers/editor/editor-provider'
import clsx from 'clsx'
import { Trash, Settings, X } from 'lucide-react'
import React, { useState, useRef, useEffect } from 'react'
import { v4 } from 'uuid'
import Recursive from './recursive'
import PropertyPanel from '@/app/template/_components/editor/editor-components/propertypanel'

type Props = { element: EditorElement }

const Container = ({ element }: Props) => {
  const { id, content, styles, type } = element
  const { dispatch, state } = useEditor()
  // Local state to track if settings panel is visible for this specific element
  const [showSettings, setShowSettings] = useState(false)
  // Refs to detect clicks outside
  const componentRef = useRef<HTMLDivElement>(null)

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

  const handleOnDrop = (e: React.DragEvent, containerId: string) => {
    e.stopPropagation()
    const componentType = e.dataTransfer.getData('componentType')
    if (!componentType || componentType === 'null') return

    // Create a function to generate element details
    const generateElementDetails = (elementType: EditorBtns, extraContent = {}, extraStyles = {}) => ({
      id: v4(),
      type: elementType,
      name: elementType ? elementType.charAt(0).toUpperCase() + elementType.slice(1) : '',
      styles: { ...defaultStyles, ...extraStyles },
      content: extraContent,
    })

    const elementMap: Record<string, () => any> = {
      text: () => generateElementDetails('text', { innerText: 'Text Element' }),
      dynamicText: () => generateElementDetails('dynamicText', { innerText: '{{text}}' }),
      link: () => generateElementDetails('link', { innerText: 'Link Element', href: '#' }),
      video: () => generateElementDetails('video', { src: '' }, {}),
      Upload:()=> generateElementDetails('Upload',{},{
        width:'100%'
      }),
      dynamicVideo: () => generateElementDetails('dynamicVideo', { src: '{{video}}' }, {}),
      dynamicImage: () => generateElementDetails('dynamicImage', { src: '{{img}}' }, {}),
      image: () => generateElementDetails('image', { src: '' }, {}),
      audio: () => generateElementDetails('audio', { src: '' }, {}),
      dynamicAudio: () => generateElementDetails('dynamicAudio', { src: '{{audio}}' }, {}),
      checkbox: () => generateElementDetails('checkbox', { selectedCheckbox: [] }, {}),
      dynamicCheckbox: () => generateElementDetails('dynamicCheckbox', { checkboxes: ['{{checkbox}}'] }, {}),
      recordAudio: () => generateElementDetails('recordAudio', {}, {}),
      recordVideo: () => generateElementDetails('recordVideo', {}, {}),
      inputRecordVideo: () => generateElementDetails('inputRecordVideo', { src: '' }, {}),
      inputRecordAudio: () => generateElementDetails('inputRecordAudio', { src: '' }, {}),
      container: () => generateElementDetails('container', [], {}),
      inputText: () => generateElementDetails('inputText', { innerText: '', limit: 10000, wordLimit: 1000,copyAllowed:true }, { width: '100%' }),
      '2Col': () => ({
        ...generateElementDetails('2Col', [
          generateElementDetails('container', [], { width: '100%' }),
          generateElementDetails('container', [], { width: '100%' }),
        ], { display: 'flex' }),
      }),
      dynamicUpload: () => generateElementDetails('dynamicUpload', 
        { 
          type: 'any',  // default file type
          limit: 1      // default file limit
        }, 
        { 
          width: '100%',
          padding: '10px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }
      ),
      dynamicCarousel: () => generateElementDetails('dynamicCarousel', 
        { 
          slides: [{
            type: 'text',
            innerText: '{{text}}'
          }],
          currentSlideIndex: 0,
          keyboardNav: true,
          autoSlide: false,
          slideInterval: 5
        }, 
        {
          width: '100%',
          padding: '10px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }
      ),
      UploadInput:()=>generateElementDetails('UploadInput')
    }

    if (componentType in elementMap) {
      dispatch({
        type: 'ADD_ELEMENT',
        payload: {
          containerId,
          elementDetails: elementMap[componentType](),
        },
      })
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDragStart = (e: React.DragEvent, dragType: EditorBtns | null) => {
    if (!dragType || dragType === '__body') return
    e.dataTransfer.setData('componentType', dragType)
  }

  const handleOnClickBody = (e: React.MouseEvent) => {
    e.stopPropagation()
    dispatch({
      type: 'CHANGE_CLICKED_ELEMENT',
      payload: {
        elementDetails: element,
      },
    })
  }

  const handleDeleteElement = (e: React.MouseEvent) => {
    e.stopPropagation()
    dispatch({
      type: 'DELETE_ELEMENT',
      payload: {
        elementDetails: element,
      },
    })
  }

  const handleToggleSettings = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent the click from bubbling
    
    // First select the element
    dispatch({
      type: 'CHANGE_CLICKED_ELEMENT',
      payload: {
        elementDetails: element,
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
        elementDetails: element,
      },
    });
  };

  const isSelected = state.editor.selectedElement.id === id
  const isLiveMode = state.editor.liveMode
  const isBody = type === '__body'

  return (
    <div
      ref={componentRef}
      style={styles}
      className={clsx('relative p-4 transition-all', {
        'max-w-full w-full': type === 'container' || type === '2Col',
        'h-fit': type === 'container',
        'h-full overflow-scroll': type === '__body',
        'flex flex-col md:!flex-row': type === '2Col',
        '!border-blue-500': isSelected && !isLiveMode && !isBody,
        '!border-yellow-400 !border-4': isSelected && !isLiveMode && isBody,
        '!border-solid': isSelected && !isLiveMode,
        'border-dashed border-[1px] border-slate-300': !isLiveMode,
      })}
      onDrop={(e) => handleOnDrop(e, id)}
      onDragOver={handleDragOver}
      draggable={type !== '__body'}
      onClick={handleOnClickBody}
      onDragStart={(e) => handleDragStart(e, type)}
    >
      {Array.isArray(content) &&
        content.map((childElement) => (
          <Recursive
            key={childElement.id}
            element={childElement}
          />
        ))}

      {isSelected && !isLiveMode && !isBody && (
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

      {/* Inline Property Panel */}
      {isSelected && showSettings && !isLiveMode && !isBody && (
        <div 
          className="absolute left-0 right-0 mt-2 z-50 bg-white border rounded-md shadow-lg"
          onClick={handlePropertyPanelClick}
        >
          <div className="flex items-center justify-between p-3 border-b">
            <h3 className="font-medium">Container Settings</h3>
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

export default Container