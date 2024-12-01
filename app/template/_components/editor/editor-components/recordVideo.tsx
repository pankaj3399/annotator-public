'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { EditorBtns } from '@/lib/constants'
import { EditorElement, useEditor } from '@/providers/editor/editor-provider'
import { useUploadThing } from '@/utils/uploadthing'
import clsx from 'clsx'
import { Send, Trash } from 'lucide-react'
import React, { useEffect, useRef } from 'react'
import { useReactMediaRecorder } from "react-media-recorder"
import ReactPlayer from 'react-player'
import { toast } from 'sonner'

type Props = {
  element: EditorElement
}

const RecordVideoComponent = (props: Props) => {
  const { dispatch, state } = useEditor()
  const [elementContent, setElementContent] = React.useState({
    src: !Array.isArray(props.element.content) ? props.element.content?.src || '' : ''
  })
  const [loading, setLoading] = React.useState(false)
  
  const { status, startRecording, stopRecording, mediaBlobUrl, previewStream } = useReactMediaRecorder({ video: true })
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current && previewStream) {
      videoRef.current.srcObject = previewStream
    }
  }, [previewStream])

  useEffect(() => {
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

  const { startUpload } = useUploadThing("videoUploader", {
    onClientUploadComplete: (data) => {
      toast('Recording uploaded successfully')
      if (!Array.isArray(props.element.content)) {
        dispatch({
          type: 'UPDATE_ELEMENT',
          payload: {
            elementDetails: {
              ...props.element,
              content: {
                ...props.element.content,
                src: data[0].url,
              },
            },
          },
        })
      }
      setElementContent(prev => ({ ...prev, src: data[0].url }))
      setLoading(false)
    },
    onUploadError: () => {
      toast.error("Error occurred while uploading")
      setLoading(false)
    },
    onUploadBegin: () => {
      setLoading(true)
    },
  })

  async function submitRecording() {
    if (mediaBlobUrl) {
      setLoading(true)
      const videoBlob = await fetch(mediaBlobUrl).then((r) => r.blob())
      const videoFile = new File([videoBlob], 'video.mp4', { type: 'video/mp4' })
      startUpload([videoFile])
    }
  }

  const isSelected = state.editor.selectedElement.id === props.element.id
  const isLiveMode = state.editor.liveMode
  const defaultWidth = props.element.styles?.width || '560px'
  const defaultHeight = props.element.styles?.height || '315px'

  return (
    <div
      style={props.element.styles}
      draggable
      onDragStart={(e) => handleDragStart(e, 'recordVideo')}
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

      {!isLiveMode && elementContent.src === '' ? (
        <div className="container mx-auto py-10">
          <Card className="w-full max-w-md mx-auto">
            <CardContent className="p-6">
              <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden mb-4">
                {(status === 'recording' || status === 'stopping') && (
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover" 
                  />
                )}
                {status === 'stopped' && mediaBlobUrl && (
                  <ReactPlayer
                    url={mediaBlobUrl}
                    controls
                    width="100%"
                    height="100%"
                  />
                )}
              </div>
              <div className="flex justify-between items-center">
                <Button
                  onClick={status === 'recording' ? stopRecording : startRecording}
                  variant={status === 'recording' ? "destructive" : "default"}
                >
                  {status === 'recording' ? "Stop Recording" : "Start Recording"}
                </Button>
                {status === 'stopped' && mediaBlobUrl && (
                  <Button 
                    onClick={submitRecording} 
                    disabled={loading}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {loading ? 'Submitting...' : 'Save'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div>
          <ReactPlayer
            url={elementContent.src}
            controls
            width={defaultWidth}
            height={defaultHeight}
          />
        </div>
      )}
    </div>
  )
}

export default RecordVideoComponent