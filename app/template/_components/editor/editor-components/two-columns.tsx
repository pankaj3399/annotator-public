'use client'

import { Badge } from '@/components/ui/badge'
import { EditorBtns, defaultStyles } from '@/lib/constants'
import { EditorElement, useEditor } from '@/providers/editor/editor-provider'
import clsx from 'clsx'
import React from 'react'
import { v4 } from 'uuid'
import RecursiveElement from './recursive'

type Props = {
  element: EditorElement
}

type ElementConfigType = {
  [K in Exclude<EditorBtns, null>]: {
    content: any
    name: string
    styles: Record<string, any>
  }
}

// Map of element configurations for cleaner element creation
const ELEMENT_CONFIGS: ElementConfigType = {
  text: {
    content: { innerText: 'Text Component' },
    name: 'Text',
    styles: { color: 'black', ...defaultStyles },
  },
  container: {
    content: [],
    name: 'Container',
    styles: { ...defaultStyles },
  },
  '2Col': {
    content: [],
    name: 'Two Columns',
    styles: { ...defaultStyles },
  },
  '3Col': {
    content: [],
    name: 'Three Columns',
    styles: { ...defaultStyles },
  },
  section: {
    content: [],
    name: 'Section',
    styles: { ...defaultStyles },
  },
  dynamicText: {
    content: { innerText: "{{text}}" },
    name: 'Dynamic Text',
    styles: { color: 'black', ...defaultStyles },
  },
  link: {
    content: { innerText: 'Link Element', href: '#' },
    name: 'Link',
    styles: { color: 'black', ...defaultStyles },
  },
  video: {
    content: { src: '' },
    name: 'Video',
    styles: {},
  },
  dynamicVideo: {
    content: { src: '{{video}}' },
    name: 'Dynamic Video',
    styles: {},
  },
  dynamicImage: {
    content: { src: '{{img}}' },
    name: 'Dynamic Image',
    styles: {},
  },
  image: {
    content: { href: '{{img}}' },
    name: 'Image',
    styles: {},
  },
  audio: {
    content: { src: '' },
    name: 'Audio',
    styles: {},
  },
  dynamicAudio: {
    content: { src: '{{audio}}' },
    name: 'Dynamic Audio',
    styles: {},
  },
  checkbox: {
    content: { selectedCheckbox: [] },
    name: 'Checkbox',
    styles: {},
  },
  dynamicCheckbox: {
    content: { checkboxes: ["{{checkbox}}"] },
    name: 'Dynamic Checkbox',
    styles: {},
  },
  recordAudio: {
    content: {},
    name: 'Record Audio',
    styles: {},
  },
  recordVideo: {
    content: {},
    name: 'Record Video',
    styles: {},
  },
  inputRecordVideo: {
    content: { src: '' },
    name: 'Input Record Video',
    styles: {},
  },
  inputRecordAudio: {
    content: { src: '' },
    name: 'Input Record Audio',
    styles: {},
  },
  inputText: {
    content: { innerText: '', limit: 10000 },
    name: 'Input Text',
    styles: { ...defaultStyles, width: '100%' },
  },
  '__body': {
    content: [],
    name: 'Body',
    styles: {},
  },
}

const TwoColumns = ({ element }: Props) => {
  const { id, content, type } = element
  const { dispatch, state } = useEditor()

  const handleAddElement = (componentType: Exclude<EditorBtns, null>) => {
    const config = ELEMENT_CONFIGS[componentType]
    if (!config) return

    dispatch({
      type: 'ADD_ELEMENT',
      payload: {
        containerId: id,
        elementDetails: {
          content: config.content,
          id: v4(),
          name: config.name,
          styles: config.styles,
          type: componentType,
        },
      },
    })
  }

  const handleOnDrop = (e: React.DragEvent) => {
    e.stopPropagation()
    const componentType = e.dataTransfer.getData('componentType') as Exclude<EditorBtns, null>
    if (componentType) {
      handleAddElement(componentType)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDragStart = (e: React.DragEvent, type: string) => {
    if (type === '__body') return
    e.dataTransfer.setData('componentType', type)
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

  const isSelected = state.editor.selectedElement.id === element.id
  const isLiveMode = state.editor.liveMode
  const isBodyType = type === '__body'

  return (
    <div
      style={element.styles}
      className={clsx('relative p-4 transition-all', {
        'h-fit': type === 'container',
        'h-full': isBodyType,
        'm-4': type === 'container',
        '!border-blue-500': isSelected && !isLiveMode,
        '!border-solid': isSelected && !isLiveMode,
        'border-dashed border-[1px] border-slate-300': !isLiveMode,
      })}
      id="innerContainer"
      onDrop={handleOnDrop}
      onDragOver={handleDragOver}
      draggable={!isBodyType}
      onClick={handleOnClickBody}
      onDragStart={(e) => handleDragStart(e, 'container')}
    >
      {isSelected && !isLiveMode && (
        <Badge className="absolute -top-[23px] -left-[1px] rounded-none rounded-t-lg">
          {state.editor.selectedElement.name}
        </Badge>
      )}
      
      {Array.isArray(content) && content.map((childElement) => (
        <RecursiveElement
          key={childElement.id}
          element={childElement}
        />
      ))}
    </div>
  )
}

export default TwoColumns