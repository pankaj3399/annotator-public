'use client'

import { EditorElement, useEditor } from '@/providers/editor/editor-provider'
import clsx from 'clsx'
import { Trash } from 'lucide-react'
import React from 'react'

type Props = {
  element: EditorElement
}

const TextComponent = (props: Props) => {
  const { dispatch, state } = useEditor()
  const [elementContent, setElementContent] = React.useState({
    innerText: !Array.isArray(props.element.content) ? props.element.content.innerText || '' : ''
  })

  React.useEffect(() => {
    setElementContent({
      innerText: !Array.isArray(props.element.content) ? props.element.content.innerText || '' : ''
    })
  }, [props.element])

  const handleDeleteElement = () => {
    dispatch({
      type: 'DELETE_ELEMENT',
      payload: { elementDetails: props.element },
    })
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

  const handleContentChange = (value: string) => {
    setElementContent(prev => ({ ...prev, innerText: value }))
    dispatch({
      type: 'UPDATE_ELEMENT',
      payload: {
        elementDetails: {
          ...props.element,
          content: {
            ...((!Array.isArray(props.element.content) && props.element.content) || {}),
            innerText: value,
          },
        },
      },
    })
  }

  const isSelected = state.editor.selectedElement.id === props.element.id
  const isLiveMode = state.editor.liveMode

  return (
    <div
      style={props.element.styles}
      className={clsx(
        'p-[2px] w-full m-[5px] relative text-[16px] transition-all',
        {
          '!border-blue-500': isSelected,
          '!border-solid': isSelected,
          'border-dashed border-[1px] border-slate-300': !isLiveMode,
        }
      )}
      onClick={handleOnClickBody}
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
    </div>
  )
}

export default TextComponent