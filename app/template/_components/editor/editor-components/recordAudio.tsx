'use client'

import { Button } from "@/components/ui/button"
import { CardContent } from "@/components/ui/card"
import { Textarea } from '@/components/ui/textarea'
import { EditorBtns } from '@/lib/constants'
import { EditorElement, useEditor } from '@/providers/editor/editor-provider'
import { useUploadThing } from '@/utils/uploadthing'
import clsx from 'clsx'
import { Download, Mic, RotateCcw, Send, Square, Trash, Settings, X } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'
import AudioPlayer from 'react-h5-audio-player'
import 'react-h5-audio-player/lib/styles.css'
import { useReactMediaRecorder } from "react-media-recorder"
import { toast } from 'sonner'
import PropertyPanel from '@/app/template/_components/editor/editor-components/propertypanel'

type Props = {
  element: EditorElement
}

const RecordAudioComponent = (props: Props) => {
  const { dispatch, state, pageDetails } = useEditor()
  // Local state to track if settings panel is visible for this specific element
  const [showSettings, setShowSettings] = useState(false)
  // Refs to detect clicks outside
  const componentRef = useRef<HTMLDivElement>(null)
  
  const [elementContent, setElementContent] = useState({
    src: !Array.isArray(props.element.content) ? props.element.content?.src || '' : '',
    transcribeEnabled: !Array.isArray(props.element.content) ? props.element.content?.transcribeEnabled || false : false,
    transcription: !Array.isArray(props.element.content) ? props.element.content?.transcription || '' : '',
    transcriptionModel: !Array.isArray(props.element.content) ? props.element.content?.transcriptionModel || 'openai-whisper-large-v2' : 'openai-whisper-large-v2',
    apiKey: !Array.isArray(props.element.content) ? props.element.content?.apiKey || '' : '',
    language: !Array.isArray(props.element.content) ? props.element.content?.language || 'en' : 'en'
  })
  const [duration, setDuration] = useState(0)
  const [loading, setLoading] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcription, setTranscription] = useState(
    !Array.isArray(props.element.content) ? props.element.content?.transcription || '' : ''
  )
  
  const { status, startRecording, stopRecording, mediaBlobUrl } = useReactMediaRecorder({ audio: true })
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Add console log to verify component is being rendered
  console.log('RecordAudioComponent rendered:', {
    elementId: props.element.id,
    isLiveMode: state.editor.liveMode,
    transcribeEnabled: elementContent.transcribeEnabled,
    hasTranscription: !!transcription,
    model: elementContent.transcriptionModel,
    src: elementContent.src
  })

  useEffect(() => {
    setElementContent({
      src: !Array.isArray(props.element.content) ? props.element.content?.src || '' : '',
      transcribeEnabled: !Array.isArray(props.element.content) ? props.element.content?.transcribeEnabled || false : false,
      transcription: !Array.isArray(props.element.content) ? props.element.content?.transcription || '' : '',
      transcriptionModel: !Array.isArray(props.element.content) ? props.element.content?.transcriptionModel || 'openai-whisper-large-v2' : 'openai-whisper-large-v2',
      apiKey: !Array.isArray(props.element.content) ? props.element.content?.apiKey || '' : '',
      language: !Array.isArray(props.element.content) ? props.element.content?.language || 'en' : 'en'
    })
    
    setTranscription(!Array.isArray(props.element.content) ? props.element.content?.transcription || '' : '')
  }, [props.element])

  // Handle clicks outside the component to maintain selection
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Only handle this logic if settings are showing
      if (!showSettings) return;
      
      // Check if the click was outside our component
      if (componentRef.current && !componentRef.current.contains(event.target as Node)) {
        // Close settings when clicking outside the entire component
        setShowSettings(false);
      }
    };

    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);
    
    // Clean up
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettings]);

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

  const handleDeleteElement = (e: React.MouseEvent) => {
    e.stopPropagation()
    dispatch({
      type: 'DELETE_ELEMENT',
      payload: { elementDetails: props.element },
    })
  }

  const handleToggleSettings = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent the click from bubbling
    
    // First select the element
    dispatch({
      type: 'CHANGE_CLICKED_ELEMENT',
      payload: {
        elementDetails: props.element,
      },
    })
    
    // Toggle settings visibility
    setShowSettings(prev => !prev)
  }

  // Handle clicks on the property panel to prevent closing
  const handlePropertyPanelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Ensure element stays selected
    dispatch({
      type: 'CHANGE_CLICKED_ELEMENT',
      payload: {
        elementDetails: props.element,
      },
    });
  };

  const reRecord = () => {
    setDuration(0)
    startRecording()
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const { startUpload } = useUploadThing("audioUploader", {
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
      setDuration(0)
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
      const audioBlob = await fetch(mediaBlobUrl).then((r) => r.blob())
      const audioFile = new File([audioBlob], 'voice.wav', { type: 'audio/wav' })
      startUpload([audioFile])
    }
  }

  const handleTranscribe = async () => {
    if (!elementContent.transcribeEnabled) {
      toast.error('Transcription is not enabled for this audio')
      return
    }

    if (!elementContent.src) {
      toast.error('No audio source available for transcription')
      return
    }

    setIsTranscribing(true)
    
    try {
      // Call your transcription API
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioUrl: elementContent.src,
          model: elementContent.transcriptionModel,
          apiKey: elementContent.apiKey,
          language: elementContent.language,
          enableChunking: true 
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Transcription failed')
      }

      const data = await response.json()
      const newTranscription = data.transcription

      // Update state and element
      setTranscription(newTranscription)
      
      if (!Array.isArray(props.element.content)) {
        dispatch({
          type: 'UPDATE_ELEMENT',
          payload: {
            elementDetails: {
              ...props.element,
              content: {
                ...props.element.content,
                transcription: newTranscription
              },
            },
          },
        })
      }
      
      toast.success('Transcription completed successfully')
    } catch (error) {
      console.error('Transcription error:', error)
      toast.error(error instanceof Error ? error.message : 'Error occurred during transcription')
    } finally {
      setIsTranscribing(false)
    }
  }

  const handleTranscriptionChange = (text: string) => {
    setTranscription(text)
    
    if (!Array.isArray(props.element.content)) {
      dispatch({
        type: 'UPDATE_ELEMENT',
        payload: {
          elementDetails: {
            ...props.element,
            content: {
              ...props.element.content,
              transcription: text
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
      ref={componentRef}
      style={props.element.styles}
      draggable
      onDragStart={(e) => handleDragStart(e, 'recordAudio')}
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
          <div className="bg-primary px-2.5 py-1 text-xs font-bold rounded-t-lg !text-white flex items-center gap-2">
            <Settings
              className={clsx("cursor-pointer hover:text-blue-200", {
                "text-blue-200": showSettings
              })}
              size={16}
              onClick={handleToggleSettings}
            />
            <Trash
              className="cursor-pointer hover:text-red-200"
              size={16}
              onClick={handleDeleteElement}
            />
          </div>
        </div>
      )}

      {!isLiveMode && elementContent.src === '' ? (
        <div className="w-full">
          <CardContent className="p-6">
            <div className="text-center mb-4">
              <span className="text-3xl font-bold text-primary">
                {formatDuration(duration)}
              </span>
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              {status !== 'recording' && !mediaBlobUrl && (
                <Button onClick={startRecording}>
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
                    <Send className="mr-2 h-4 w-4" /> {loading ? 'Submitting...' : 'Save'}
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
      ) : (
        <div className="w-full">
          <AudioPlayer
            autoPlay
            src={elementContent.src}
          />
          
{elementContent.transcribeEnabled && isLiveMode && (
  <div className="mt-4 border-t pt-4 px-4 pb-4">
    <div className="flex justify-between items-center mb-2">
      <h3 className="text-sm font-medium">Transcription</h3>
      {!pageDetails.submitted && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleTranscribe}
          disabled={isTranscribing}
        >
          {isTranscribing ? 'Transcribing...' : 'Auto-Transcribe'}
        </Button>
      )}
    </div>
    
    <Textarea
      value={transcription}
      onChange={(e) => handleTranscriptionChange(e.target.value)}
      placeholder="Listen to the audio and type your transcription here. You can also click 'Auto-Transcribe' for assistance."
      className="min-h-[120px] resize-y"
      readOnly={pageDetails.submitted}
    />
  </div>
)}
        </div>
      )}

      {/* Inline Property Panel */}
      {isSelected && showSettings && !isLiveMode && (
        <div 
          className="absolute left-0 right-0 mt-2 z-50 bg-white border rounded-md shadow-lg"
          onClick={handlePropertyPanelClick}
        >
          <div className="flex items-center justify-between p-3 border-b">
            <h3 className="font-medium">Audio Recorder Settings</h3>
            <button 
              onClick={handleToggleSettings}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <X size={16} />
            </button>
          </div>
          <div className="p-4">
            <PropertyPanel />
          </div>
        </div>
      )}
    </div>
  )
}

export default RecordAudioComponent