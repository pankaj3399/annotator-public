'use client'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { EditorBtns } from '@/lib/constants'
import { EditorElement, useEditor } from '@/providers/editor/editor-provider'
import clsx from 'clsx'
import { Trash } from 'lucide-react'

import React from 'react'

type Props = {
  element: EditorElement
}

const InputText = (props: Props) => {
  const { dispatch, state, subaccountId, funnelId, pageDetails } = useEditor()
  const [name, setName] = React.useState(props.element.name)
  const [charLimit, setCharLimit] = React.useState(props.element.content?.limit || 10000)
  const [wordLimit, setWordLimit] = React.useState(props.element.content?.wordLimit || 1000)
  const initialText = React.useMemo(() => {
    if (Array.isArray(props.element.content)) {
      return ''
    }
    return props.element.content?.innerText || ''
  }, [props.element.content])

  const [text, setText] = React.useState(initialText)

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

  const styles = props.element.styles

  const handleDeleteElement = () => {
    dispatch({
      type: 'DELETE_ELEMENT',
      payload: { elementDetails: props.element },
    })
  }

  const countWords = (text: string) => text.trim().split(/\s+/).length;

  return (
    <div
      style={styles}
      draggable
      onDragStart={(e) => handleDragStart(e, 'inputText')}
      onClick={handleOnClickBody}
      className={clsx(
        'p-[2px] w-full m-[5px] relative text-[16px] transition-all flex items-center justify-center',
        {
          '!border-blue-500':
            state.editor.selectedElement.id === props.element.id,
          '!border-solid': state.editor.selectedElement.id === props.element.id,
          'border-dashed border-[1px] border-slate-300': !state.editor.liveMode,
        }
      )}
    >
      {state.editor.selectedElement.id === props.element.id &&
        !state.editor.liveMode && (
          <div className="absolute -top-[23px] -left-[1px] flex">
            <Input className="w-full h-6 bg-black text-white font-semibold text-xs rounded-none rounded-t-lg" placeholder='title' value={name} onChange={(e) => setName(e.target.value)}
              onBlur={(e) => dispatch({
                type: 'UPDATE_ELEMENT',
                payload: {
                  elementDetails: { ...props.element, name: e.target.value},
                },
              })} />
            <span className="flex">
              <Label htmlFor="char" className='w-full px-1 h-6 text-nowrap inline-flex items-center justify-center bg-black text-white font-semibold text-xs rounded-none rounded-tl-lg'>Char limit:</Label>
              <Input className="w-full h-6 bg-black text-white font-semibold text-xs rounded-none rounded-tr-lg" placeholder='Char limit' type="number" value={charLimit} onChange={(e) => setCharLimit(parseInt(e.target.value))}
                onBlur={(e) => dispatch({
                  type: 'UPDATE_ELEMENT',
                  payload: {
                    elementDetails: {
                      ...props.element,
                      content: {
                        ...props.element.content,
                        limit: charLimit,
                      },
                    },
                  },
                })} />
              <Label htmlFor="word" className='w-full inline-flex items-center justify-center px-1 h-6 text-nowrap bg-black text-white font-semibold text-xs rounded-none rounded-tl-lg'>Word limit:</Label>
              <Input className="w-full h-6 bg-black text-white font-semibold text-xs rounded-none rounded-tr-lg" placeholder='Word limit' type="number" value={wordLimit} onChange={(e) => setWordLimit(parseInt(e.target.value))}
                onBlur={(e) => dispatch({
                  type: 'UPDATE_ELEMENT',
                  payload: {
                    elementDetails: {
                      ...props.element,
                      content: {
                        ...props.element.content,
                        wordLimit: wordLimit,
                      },
                    },
                  },
                })} />
            </span>
          </div>
        )}

      <form className="flex w-full items-center space-x-2" >
        <Textarea placeholder="write here" required value={text} maxLength={charLimit} disabled={pageDetails.submitted}
          onChange={(e) => {
            const inputValue = e.target.value;
            const wordCount = countWords(inputValue);

            // Update text if within character and word limits
            if (inputValue.length <= charLimit && wordCount <= wordLimit) {
              setText(inputValue);
            }
          }}
          onBlur={(e) => {
            const inputValue = e.target.value;
            dispatch({
              type: 'UPDATE_ELEMENT',
              payload: {
                elementDetails: {
                  ...props.element,
                  content: {
                    ...props.element.content,
                    innerText: inputValue,
                  },
                },
              },
            })
          }}
        />
        {/* <div className="flex flex-col items-start mt-2 text-xs">
          <div>Characters: {text.length}/{charLimit}</div>
          <div>Words: {countWords(text)}/{wordLimit}</div>
        </div> */}
      </form>

      {state.editor.selectedElement.id === props.element.id &&
        !state.editor.liveMode && (
          <div className="absolute bg-primary px-2.5 py-1 text-xs font-bold -top-[25px] -right-[1px] rounded-none rounded-t-lg !text-white">
            <Trash
              className="cursor-pointer"
              size={16}
              onClick={handleDeleteElement}
            />
          </div>
        )}
    </div>
  )
}

export default InputText
