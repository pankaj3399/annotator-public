'use client'

import { EditorBtns } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { EditorElement, useEditor } from '@/providers/editor/editor-provider'
import clsx from 'clsx'
import { Trash } from 'lucide-react'
import React from 'react'
import AudioPlayer from 'react-h5-audio-player'
import 'react-h5-audio-player/lib/styles.css'

type Props = {
  element: EditorElement
}

const DynamicAudioComponent = (props: Props) => {
  const { dispatch, state } = useEditor()
  const [elementContent, setElementContent] = React.useState({
    src: !Array.isArray(props.element.content) ? props.element.content?.src || '' : ''
  })

  React.useEffect(() => {
    setElementContent({
      src: !Array.isArray(props.element.content) ? props.element.content?.src || '' : ''
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

  const isSelected = state.editor.selectedElement.id === props.element.id
  const isLiveMode = state.editor.liveMode

  return (
    <div
      style={props.element.styles}
      draggable
      onDragStart={(e) => handleDragStart(e, 'dynamicAudio')}
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
          <div className="bg-primary px-2.5 py-1 text-xs font-bold rounded-none rounded-t-lg !text-white">
            <Trash
              className="cursor-pointer"
              size={16}
              onClick={handleDeleteElement}
            />
          </div>
        </div>
      )}

      {isLiveMode ? (
        <div className="w-full">
          <AudioPlayer
            autoPlay={false}
            src={elementContent.src}
            className="w-full"
          />
        </div>
      ) : (
        <div className={cn('w-fit h-fit bg-muted rounded-lg p-2')}>
          <div className="mb-2 text-sm text-muted-foreground">Audio will be here</div>
          <AudioPlayer
            autoPlay={false}
            src={elementContent.src}
            className="w-full"
          />
        </div>
      )}
    </div>
  )
}

export default DynamicAudioComponent