'use client'

import { EditorBtns } from '@/lib/constants'
import { EditorElement, useEditor } from '@/providers/editor/editor-provider'
import clsx from 'clsx'
import { Trash } from 'lucide-react'
import React from 'react'

type Props = {
  element: EditorElement
}

const LinkComponent = (props: Props) => {
  const { dispatch, state } = useEditor()
  const [elementContent, setElementContent] = React.useState({
    innerText: !Array.isArray(props.element.content) ? props.element.content?.innerText || '' : '',
    href: !Array.isArray(props.element.content) ? props.element.content?.href || '' : ''
  })

  React.useEffect(() => {
    setElementContent({
      innerText: !Array.isArray(props.element.content) ? props.element.content?.innerText || '' : '',
      href: !Array.isArray(props.element.content) ? props.element.content?.href || '' : ''
    })
  }, [props.element])

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

  const handleDeleteElement = () => {
    dispatch({
      type: 'DELETE_ELEMENT',
      payload: { elementDetails: props.element },
    })
  }

  const handleContentChange = (value: string) => {
    setElementContent(prev => ({ ...prev, innerText: value, href: value }))
    
    if (!Array.isArray(props.element.content)) {
      dispatch({
        type: 'UPDATE_ELEMENT',
        payload: {
          elementDetails: {
            ...props.element,
            content: {
              ...((!Array.isArray(props.element.content) && props.element.content) || {}),
              innerText: value,
              href: value,
            },
          },
        },
      })
    }
  }

  const isSelected = state.editor.selectedElement.id === props.element.id
  const isLiveMode = state.editor.liveMode
  const isPreviewMode = state.editor.previewMode

  return (
    <div
      style={props.element.styles}
      draggable
      onDragStart={(e) => handleDragStart(e, 'text')}
      onClick={handleOnClickBody}
      className={clsx(
        'p-[2px] w-full m-[5px] relative text-[16px] transition-all',
        {
          '!border-blue-500': isSelected,
          '!border-solid': isSelected,
          'border-dashed border-[1px] border-slate-300': !isLiveMode,
        }
      )}
    >
      {isSelected && !isLiveMode && (
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

      {!isPreviewMode && !isLiveMode ? (
        <div
          contentEditable={!isLiveMode}
          onBlur={(e) => {
            const target = e.target as HTMLDivElement
            handleContentChange(target.innerText)
          }}
          className="outline-none w-full"
          suppressContentEditableWarning={true}
        >
          {elementContent.innerText}
        </div>
      ) : (
        <a href={elementContent.href} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
          {elementContent.innerText}
        </a>
      )}
    </div>
  )
}

export default LinkComponent