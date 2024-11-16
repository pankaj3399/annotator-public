'use client'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { EditorBtns } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { EditorElement, useEditor } from '@/providers/editor/editor-provider'
import clsx from 'clsx'
import { Trash } from 'lucide-react'
import React from 'react'
import AudioPlayer from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';

type Props = {
  element: EditorElement
}

const DynamicAudioComponent = (props: Props) => {
  const { dispatch, state } = useEditor()
  const [name, setName] = React.useState(props.element.name)

  const styles = props.element.styles

  const initialSrc = React.useMemo(() => {
    if (Array.isArray(props.element.content)) {
      return ''
    }
    return props.element.content?.src || ''
  }, [props.element.content])

  const [src, setSrc] = React.useState(initialSrc)

  const handleDragStart = (e: React.DragEvent, type: EditorBtns) => {
    if (type === null) return
    e.dataTransfer.setData('componentType', type)
  }

  const handleOnClick = (e: React.MouseEvent) => {
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


  return (
    <div
      style={styles}
      draggable
      onDragStart={(e) => handleDragStart(e, 'dynamicAudio')}
      onClick={handleOnClick}
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
          <div className="absolute -top-[23px] -left-[1px]  flex ">
          {/* <Badge className=" rounded-none rounded-t-lg">
            {state.editor.selectedElement.name}
          </Badge> */}
          <Input className="w-full h-6 bg-black text-white font-semibold text-xs rounded-none rounded-t-lg" placeholder='title' value={name} onChange={(e) => setName(e.target.value)}
            onBlur={(e) => dispatch({
              type: 'UPDATE_ELEMENT',
              payload: {
                elementDetails: { ...props.element, name: e.target.value},
              },
            })} />
        </div>
        )}

      {!Array.isArray(props.element.content) && state.editor.liveMode && (
        <AudioPlayer
          src={src}
        // other props here
        />

      )}
      {!Array.isArray(props.element.content) && !state.editor.liveMode && (
        <div style={styles} className={cn(`w-fit h-fit bg-muted  rounded-lg p-2`)}>
          {!state.editor.liveMode && "audio will be here"}
          <AudioPlayer
            src={src}
          // other props here
          />

        </div>
      )}

      {state.editor.selectedElement.id === props.element.id &&
        !state.editor.liveMode && (
          <div className="absolute bg-primary px-2.5 py-1 text-xs font-bold  -top-[25px] -right-[1px] rounded-none rounded-t-lg !text-white">
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

export default DynamicAudioComponent
