'use client'
import { Badge } from '@/components/ui/badge'
import { EditorBtns, defaultStyles } from '@/lib/constants'
import { EditorElement, useEditor } from '@/providers/editor/editor-provider'
import clsx from 'clsx'
import { Trash } from 'lucide-react'
import React from 'react'
import { v4 } from 'uuid'
import Recursive from './recursive'

type Props = { element: EditorElement }

const Container = ({ element }: Props) => {
  const { id, content,  styles, type } = element
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
              content: { innerText: 'Text Element' },
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
              styles: { },
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
                checkboxes:["{{checkbox}}"],
              },
              id: v4(),
              name: 'dynamicCheckbox',
              styles: { },
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
              styles: { },
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
              content: { },
              id: v4(),
              name: 'recordVideo',
              styles: { },
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
              content: { src : '' },
              id: v4(),
              name: 'inputRecordVideo',
              styles: { },
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
              content: { src : '' },
              id: v4(),
              name: 'inputRecordAudio',
              styles: { },
              type: 'inputRecordAudio',
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
      case 'inputText':
        dispatch({
          type: 'ADD_ELEMENT',
          payload: {
            containerId: id,
            elementDetails: {
              content: { innerText: '', limit: 10000,wordLimit:1000 },
              id: v4(),
              name: 'input Text',
              styles: { ...defaultStyles, width: '100%' },
              type: 'inputText',
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
              content: [
                {
                  content: [],
                  id: v4(),
                  name: 'Container',
                  styles: { ...defaultStyles, width: '100%' },
                  type: 'container',
                },
                {
                  content: [],
                  id: v4(),
                  name: 'Container',
                  styles: { ...defaultStyles, width: '100%' },
                  type: 'container',
                },
              ],
              id: v4(),
              name: 'Two Columns',
              styles: { ...defaultStyles, display: 'flex' },
              type: '2Col',
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

  return (
    <div
      style={styles}
      className={clsx('relative p-4 transition-all group', {
        'max-w-full w-full': type === 'container' || type === '2Col',
        'h-fit': type === 'container',
        'h-full': type === '__body',
        'overflow-scroll ': type === '__body',
        'flex flex-col md:!flex-row': type === '2Col',
        '!border-blue-500':
          state.editor.selectedElement.id === id &&
          !state.editor.liveMode &&
          state.editor.selectedElement.type !== '__body',
        '!border-yellow-400 !border-4':
          state.editor.selectedElement.id === id &&
          !state.editor.liveMode &&
          state.editor.selectedElement.type === '__body',
        '!border-solid':
          state.editor.selectedElement.id === id && !state.editor.liveMode,
        'border-dashed border-[1px] border-slate-300': !state.editor.liveMode,
      })}
      onDrop={(e) => handleOnDrop(e, id)}
      onDragOver={handleDragOver}
      draggable={type !== '__body'}
      onClick={handleOnClickBody}
      onDragStart={(e) => handleDragStart(e, 'container')}
    >
      <Badge
        className={clsx(
          'absolute -top-[23px] -left-[1px] rounded-none rounded-t-lg hidden',
          {
            block:
              state.editor.selectedElement.id === element.id &&
              !state.editor.liveMode,
          }
        )}
      >
        {element.name}
      </Badge>

      {Array.isArray(content) &&
        content.map((childElement) => (
          <Recursive
            key={childElement.id}
            element={childElement}
          />
        ))}

      {state.editor.selectedElement.id === element.id &&
        !state.editor.liveMode &&
        state.editor.selectedElement.type !== '__body' && (
          <div className="absolute bg-primary  px-2.5 py-1 text-xs font-bold  -top-[25px] -right-[1px] rounded-none rounded-t-lg  !text-white">
            <Trash
              size={16}
              onClick={handleDeleteElement}
            />
          </div>
        )}
    </div>
  )
}

export default Container
