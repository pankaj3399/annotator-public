'use client'
import { Badge } from '@/components/ui/badge';
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { EditorBtns } from '@/lib/constants';
import { EditorElement, useEditor } from '@/providers/editor/editor-provider';
import { useUploadThing } from '@/utils/uploadthing';
import clsx from 'clsx';
import { Mic, RotateCcw, Send, Square, Trash } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import AudioPlayer from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';
import { useReactMediaRecorder } from "react-media-recorder";
import { toast } from 'sonner';

type Props = {
  element: EditorElement
}

const RecordAudioComponent = (props: Props) => {
  const { dispatch, state } = useEditor()
  const [name, setName] = React.useState(props.element.name)

  const { status, startRecording, stopRecording, mediaBlobUrl } = useReactMediaRecorder({ audio: true });
  const styles = props.element.styles
  const [duration, setDuration] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const [loading,setLoading] = useState(false)

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

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

  const reRecord = () => {
    setDuration(0)
    startRecording()
  }

  const { startUpload, routeConfig } = useUploadThing("audioUploader", {
    onClientUploadComplete: (data) => {
      setSrc(data[0].url)
      setLoading(false)
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
    },
    onUploadError: () => {
      alert("error occurred while uploading");
      setLoading(false)
    },
    onUploadBegin: () => {
      console.log("upload has begun");
    },
  });

  async function submitRecording() {
    if (mediaBlobUrl) {
      setLoading(true)
      // console.log('Submitting recording:', mediaBlobUrl)
      const audioBlob = await fetch(mediaBlobUrl).then((r) => r.blob());
      const audioFile = new File([audioBlob], 'voice.wav', { type: 'audio/wav' });
      startUpload([audioFile])
    }
  }


  return (
    <div
      style={styles}
      draggable
      onDragStart={(e) => handleDragStart(e, 'recordAudio')}
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

      {!Array.isArray(props.element.content) && !state.editor.liveMode && src === '' && (
        <div className="w-full">
          <CardContent className="p-6 ">
            <div className="text-center mb-4">
              <span className="text-3xl font-bold text-primary">{formatDuration(duration)}</span>
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              {status != 'recording' && !mediaBlobUrl && (
                <Button onClick={startRecording} className="">
                  <Mic className="mr-2 h-4 w-4" /> Start Recording
                </Button>
              )}
              {status === 'recording' && (
                <Button onClick={stopRecording} variant="outline" className="">
                  <Square className="mr-2 h-4 w-4" /> Stop
                </Button>
              )}
              {status != 'recording' && mediaBlobUrl && (
                <>
                  <Button onClick={reRecord} variant="outline" className="border-primary text-primary hover:bg-primary/10">
                    <RotateCcw className="mr-2 h-4 w-4" /> Re-record
                  </Button>
                  <Button onClick={submitRecording} disabled={loading} className="">
                    <Send className="mr-2 h-4 w-4" /> {loading ? 'Submiting...' : 'Submit'}
                  </Button>
                  <AudioPlayer
                    autoPlay
                    src={mediaBlobUrl}
                  />
                </>
              )}
            </div>
          </CardContent>
        </div>
      )}

      {(state.editor.liveMode || src != '' )&& (
        <div className="w-full">
          <AudioPlayer
            autoPlay
            src={src}
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

export default RecordAudioComponent
