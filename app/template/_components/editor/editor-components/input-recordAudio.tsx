'use client'

import { Button } from "@/components/ui/button"
import { CardContent } from "@/components/ui/card"
import useStatus from '@/hooks/use-status'
import useTimer from '@/hooks/use-timer'
import { EditorBtns } from '@/lib/constants'
import { EditorElement, useEditor } from '@/providers/editor/editor-provider'
import { useUploadThing } from '@/utils/uploadthing'
import clsx from 'clsx'
import { Mic, RotateCcw, Send, Square, Trash } from 'lucide-react'
import { useSession } from 'next-auth/react'
import React, { useEffect, useRef } from 'react'
import AudioPlayer from 'react-h5-audio-player'
import 'react-h5-audio-player/lib/styles.css'
import { useReactMediaRecorder } from "react-media-recorder"
import { toast } from "sonner"

type Props = {
  element: EditorElement
}

const InputRecordAudioComponent = (props: Props) => {
  const { dispatch, state } = useEditor()
  const [elementContent, setElementContent] = React.useState({
    src: !Array.isArray(props.element.content) ? props.element.content?.src || '' : ''
  })
  const [duration, setDuration] = React.useState(0)
  const [loading, setLoading] = React.useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  
  const { status, startRecording, stopRecording, mediaBlobUrl } = useReactMediaRecorder({ audio: true })
  const { setRunning } = useTimer()
  const { status: STATUS, submitted } = useStatus()
  const session = useSession()

  useEffect(() => {
    const validContent = !Array.isArray(props.element.content) && !(STATUS === 'reassigned' && submitted === false)
    setElementContent({
      src: validContent ? props.element.content?.src || '' : ''
    })

    if (!validContent && elementContent.src !== '' && !loading) {
      dispatch({
        type: 'UPDATE_ELEMENT',
        payload: {
          elementDetails: {
            ...props.element,
            content: {
              ...props.element.content,
              src: '',
            },
          },
        },
      })
    }
  }, [props.element, STATUS, submitted, loading])

  useEffect(() => {
    if (status === 'recording') {
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1)
      }, 1000)
    } else if (status === 'stopped') {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [status])

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

  const reRecord = () => {
    setDuration(0)
    startRecording()
  }

  const { startUpload } = useUploadThing("audioUploader", {
    onClientUploadComplete: async (data) => {
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

      setDuration(0)
      setElementContent(prev => ({ ...prev, src: data[0].url }))
      setRunning(true)
      setLoading(false)
    },
    onUploadError: () => {
      toast.error("Error occurred while uploading")
      setLoading(false)
      setRunning(true)
    },
    onUploadBegin: () => {
      setRunning(false)
    },
  })

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  async function submitRecording() {
    if (mediaBlobUrl) {
      setLoading(true)
      const audioBlob = await fetch(mediaBlobUrl).then((r) => r.blob())
      const audioFile = new File([audioBlob], 'voice.wav', { type: 'audio/wav' })
      startUpload([audioFile])
    }
  }

  const isSelected = state.editor.selectedElement.id === props.element.id
  const isLiveMode = state.editor.liveMode

  return (
    <div
      style={props.element.styles}
      draggable
      onDragStart={(e) => handleDragStart(e, 'inputRecordAudio')}
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

      {elementContent.src === '' ? (
        <div className="w-full">
          <CardContent className="p-6">
            <div className="text-center mb-4">
              <span className="text-3xl font-bold text-primary">{formatDuration(duration)}</span>
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              {status !== 'recording' && !mediaBlobUrl && (
                <Button 
                  onClick={startRecording} 
                  disabled={session.data?.user.role === 'project manager'}
                >
                  <Mic className="mr-2 h-4 w-4" /> Start Recording
                </Button>
              )}
              {status === 'recording' && (
                <Button onClick={stopRecording} variant="outline">
                  <Square className="mr-2 h-4 w-4" /> Stop
                </Button>
              )}
              {status !== 'recording' && mediaBlobUrl && (
                <>
                  <Button 
                    onClick={reRecord} 
                    variant="outline" 
                    className="border-primary text-primary hover:bg-primary/10"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" /> Re-record
                  </Button>
                  <Button onClick={submitRecording} disabled={loading}>
                    <Send className="mr-2 h-4 w-4" /> {loading ? 'Submitting...' : 'Submit'}
                  </Button>
                  <AudioPlayer autoPlay src={mediaBlobUrl} />
                </>
              )}
            </div>
            {!isLiveMode && (
              <div className="flex mb-0 mt-2 justify-center">
                Annotator Input
              </div>
            )}
          </CardContent>
        </div>
      ) : (
        <div className="w-full">
          <AudioPlayer autoPlay src={elementContent.src} />
        </div>
      )}
    </div>
  )
}

export default InputRecordAudioComponent