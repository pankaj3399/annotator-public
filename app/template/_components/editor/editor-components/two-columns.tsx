'use client'
import { EditorElement, useEditor } from '@/providers/editor/editor-provider'
import React from 'react'
import RecursiveElement from './recursive'

import { v4 } from 'uuid'
import clsx from 'clsx'
import { Badge } from '@/components/ui/badge'
import { EditorBtns, defaultStyles } from '@/lib/constants'

type Props = {
  element: EditorElement
}

const TwoColumns = (props: Props) => {
  const { id, content, type } = props.element
  const { dispatch, state } = useEditor()

  const handleOnDrop = (e: React.DragEvent, type: string) => {
    e.stopPropagation()
    const componentType = e.dataTransfer.getData('componentType') as EditorBtns
    switch (componentType) {
      case 'text':
        dispatch({
          type: 'ADD_ELEMENT',
          payload: {
            containerId: id,
            elementDetails: {
              content: { innerText: 'Text Component' },
              id: v4(),
              name: 'Text',
              styles: {
                color: 'black',
                ...defaultStyles,
              },
              type: 'text',
            },
          },
        })
        break
      case 'container':
        dispatch({
          type: 'ADD_ELEMENT',
          payload: {
            containerId: id,
            elementDetails: {
              content: [],
              id: v4(),
              name: 'Container',
              styles: { ...defaultStyles },
              type: 'container',
            },
          },
        })
        break
      case '2Col':
        dispatch({
          type: 'ADD_ELEMENT',
          payload: {
            containerId: id,
            elementDetails: {
              content: [],
              id: v4(),
              name: 'Two Columns',
              styles: { ...defaultStyles },
              type: '2Col',
            },
          },
        })
        break
      case 'dynamicText':
        dispatch({
          type: 'ADD_ELEMENT',
          payload: {
            containerId: id,
            elementDetails: {
              content: {
                innerText: "{{text}}",
              },
              id: v4(),
              name: 'dynamicText',
              styles: {
                color: 'black',
                ...defaultStyles,
              },
              type: 'dynamicText',
            },
          },
        })
        break
      case 'link':
        dispatch({
          type: 'ADD_ELEMENT',
          payload: {
            containerId: id,
            elementDetails: {
              content: {
                innerText: 'Link Element',
                href: '#',
              },
              id: v4(),
              name: 'Link',
              styles: {
                color: 'black',
                ...defaultStyles,
              },
              type: 'link',
            },
          },
        })
        break
      case 'video':
        dispatch({
          type: 'ADD_ELEMENT',
          payload: {
            containerId: id,
            elementDetails: {
              content: {
                src: '',
              },
              id: v4(),
              name: 'Video',
              styles: {},
              type: 'video',
            },
          },
        })
        break
      case 'dynamicVideo':
        dispatch({
          type: 'ADD_ELEMENT',
          payload: {
            containerId: id,
            elementDetails: {
              content: {
                src: '{{video}}',
              },
              id: v4(),
              name: 'Dynamic Video',
              styles: {},
              type: 'dynamicVideo',
            },
          },
        })
        break
      case 'dynamicImage':
        dispatch({
          type: 'ADD_ELEMENT',
          payload: {
            containerId: id,
            elementDetails: {
              content: {
                src: '{{img}}',
              },
              id: v4(),
              name: 'Dynamic image',
              styles: {},
              type: 'dynamicImage',
            },
          },
        })
        break
      case 'image':
        dispatch({
          type: 'ADD_ELEMENT',
          payload: {
            containerId: id,
            elementDetails: {
              content: {
                href: '{{img}}',
              },
              id: v4(),
              name: 'Image',
              styles: {},
              type: 'image',
            },
          },
        })
        break
      case 'audio':
        dispatch({
          type: 'ADD_ELEMENT',
          payload: {
            containerId: id,
            elementDetails: {
              content: {
                src: '',
              },
              id: v4(),
              name: 'audio',
              styles: {},
              type: 'audio',
            },
          },
        })
        break
      case 'dynamicAudio':
        dispatch({
          type: 'ADD_ELEMENT',
          payload: {
            containerId: id,
            elementDetails: {
              content: {
                src: '{{audio}}',
              },
              id: v4(),
              name: 'audio',
              styles: {},
              type: 'dynamicAudio',
            },
          },
        })
        break
      case 'checkbox':
        dispatch({
          type: 'ADD_ELEMENT',
          payload: {
            containerId: id,
            elementDetails: {
              content: {
                selectedCheckbox: [],
              },
              id: v4(),
              name: 'checkbox',
              styles: {},
              type: 'checkbox',
            },
          },
        })
        break
      case 'dynamicCheckbox':
        dispatch({
          type: 'ADD_ELEMENT',
          payload: {
            containerId: id,
            elementDetails: {
              content: {
                checkboxes: ["{{checkbox}}"],
              },
              id: v4(),
              name: 'dynamicCheckbox',
              styles: {},
              type: 'dynamicCheckbox',
            },
          },
        })
        break
      case 'recordAudio':
        dispatch({
          type: 'ADD_ELEMENT',
          payload: {
            containerId: id,
            elementDetails: {
              content: {},
              id: v4(),
              name: 'recordAudio',
              styles: {},
              type: 'recordAudio',
            },
          },
        })
        break
      case 'recordVideo':
        dispatch({
          type: 'ADD_ELEMENT',
          payload: {
            containerId: id,
            elementDetails: {
              content: {},
              id: v4(),
              name: 'recordVideo',
              styles: {},
              type: 'recordVideo',
            },
          },
        })
        break
      case 'inputRecordVideo':
        dispatch({
          type: 'ADD_ELEMENT',
          payload: {
            containerId: id,
            elementDetails: {
              content: { src: '' },
              id: v4(),
              name: 'inputRecordVideo',
              styles: {},
              type: 'inputRecordVideo',
            },
          },
        })
        break
      case 'inputRecordAudio':
        dispatch({
          type: 'ADD_ELEMENT',
          payload: {
            containerId: id,
            elementDetails: {
              content: { src: '' },
              id: v4(),
              name: 'inputRecordAudio',
              styles: {},
              type: 'inputRecordAudio',
            },
          },
        })
        break
      case 'inputText':
        dispatch({
          type: 'ADD_ELEMENT',
          payload: {
            containerId: id,
            elementDetails: {
              content: { innerText: '', limit: 10000 },
              id: v4(),
              name: 'input Text',
              styles: { ...defaultStyles, width: '100%' },
              type: 'inputText',
            },
          },
        })
        break
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
        elementDetails: props.element,
      },
    })
  }

  return (
    <div
      style={props.element.styles}
      className={clsx('relative p-4 transition-all', {
        'h-fit': type === 'container',
        'h-full': type === '__body',
        'm-4': type === 'container',
        '!border-blue-500':
          state.editor.selectedElement.id === props.element.id &&
          !state.editor.liveMode,
        '!border-solid':
          state.editor.selectedElement.id === props.element.id &&
          !state.editor.liveMode,
        'border-dashed border-[1px] border-slate-300': !state.editor.liveMode,
      })}
      id="innerContainer"
      onDrop={(e) => handleOnDrop(e, id)}
      onDragOver={handleDragOver}
      draggable={type !== '__body'}
      onClick={handleOnClickBody}
      onDragStart={(e) => handleDragStart(e, 'container')}
    >
      {state.editor.selectedElement.id === props.element.id &&
        !state.editor.liveMode && (
          <Badge className="absolute -top-[23px] -left-[1px] rounded-none rounded-t-lg ">
            {state.editor.selectedElement.name}
          </Badge>
        )}
      {Array.isArray(content) &&
        content.map((childElement) => (
          <RecursiveElement
            key={childElement.id}
            element={childElement}
          />
        ))}
    </div>
  )
}

export default TwoColumns
