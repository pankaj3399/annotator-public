'use client'

import { EditorElement, useEditor } from '@/providers/editor/editor-provider'
import { Textarea } from '@/components/ui/textarea'
import { Trash } from 'lucide-react'
import clsx from 'clsx'
import React from 'react'

type Props = {
  element: EditorElement
}

const InputText = (props: Props) => {
  const { dispatch, state, pageDetails } = useEditor()

  const [elementContent, setElementContent] = React.useState({
    innerText: !Array.isArray(props.element.content) ? props.element.content?.innerText || '' : '',
    charLimit: !Array.isArray(props.element.content) ? props.element.content?.limit || 10000 : 10000,
    wordLimit: !Array.isArray(props.element.content) ? props.element.content?.wordLimit || 1000 : 1000
  })

  React.useEffect(() => {
    setElementContent({
      innerText: !Array.isArray(props.element.content) ? props.element.content?.innerText || '' : '',
      charLimit: !Array.isArray(props.element.content) ? props.element.content?.limit || 10000 : 10000,
      wordLimit: !Array.isArray(props.element.content) ? props.element.content?.wordLimit || 1000 : 1000
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

  const countWords = (text: string) => text.trim().split(/\s+/).length

  const handleContentChange = (value: string) => {
    const wordCount = countWords(value)
    
    // Only update if within limits
    if (value.length <= elementContent.charLimit && wordCount <= elementContent.wordLimit) {
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
  }

  const isSelected = state.editor.selectedElement.id === props.element.id
  const isLiveMode = state.editor.liveMode

  return (
    <div
      style={props.element.styles}
      className={clsx(
        'p-[2px] w-full m-[5px] relative text-[16px] transition-all flex items-center justify-center',
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

      <form className="flex w-full items-center space-x-2">
        <Textarea 
          placeholder="write here" 
          required 
          value={elementContent.innerText}
          maxLength={elementContent.charLimit}
          disabled={pageDetails.submitted}
          onChange={(e) => handleContentChange(e.target.value)}
          className="w-full"
        />
      </form>
    </div>
  )
}

export default InputText