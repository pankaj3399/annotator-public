'use client'

import { EditorBtns, defaultStyles } from '@/lib/constants'
import { EditorElement, useEditor } from '@/providers/editor/editor-provider'
import clsx from 'clsx'
import { Trash } from 'lucide-react'
import React from 'react'
import { v4 } from 'uuid'
import Recursive from './recursive'

type Props = { element: EditorElement }

const Container = ({ element }: Props) => {
  const { id, content, styles, type } = element
  const { dispatch, state } = useEditor()

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
      inputText: () => generateElementDetails('inputText', { innerText: '', limit: 10000, wordLimit: 1000 }, { width: '100%' }),
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

  const handleDeleteElement = () => {
    dispatch({
      type: 'DELETE_ELEMENT',
      payload: {
        elementDetails: element,
      },
    })
  }

  const isSelected = state.editor.selectedElement.id === id
  const isLiveMode = state.editor.liveMode
  const isBody = type === '__body'

  return (
    <div
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
          <div className="bg-primary px-2.5 py-1 text-xs font-bold rounded-none rounded-t-lg !text-white">
            <Trash
              className="cursor-pointer"
              size={16}
              onClick={handleDeleteElement}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default Container