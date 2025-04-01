'use client'

import { Button } from "@/components/ui/button"
import { Textarea } from '@/components/ui/textarea'
import { EditorBtns } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { EditorElement, useEditor } from '@/providers/editor/editor-provider'
import clsx from 'clsx'
import { Trash } from 'lucide-react'
import React, { useState, useEffect } from 'react'
import AudioPlayer from 'react-h5-audio-player'
import 'react-h5-audio-player/lib/styles.css'
import { toast } from 'sonner'

type Props = {
  element: EditorElement
}

const DynamicAudioComponent = (props: Props) => {
  const { dispatch, state } = useEditor()
  const [elementContent, setElementContent] = useState({
    src: !Array.isArray(props.element.content) ? props.element.content?.src || '' : '',
    transcribeEnabled: !Array.isArray(props.element.content) ? props.element.content?.transcribeEnabled || false : false,
    transcription: !Array.isArray(props.element.content) ? props.element.content?.transcription || '' : '',
    transcriptionModel: !Array.isArray(props.element.content) ? props.element.content?.transcriptionModel || 'openai-whisper-large-v2' : 'openai-whisper-large-v2',
    apiKey: !Array.isArray(props.element.content) ? props.element.content?.apiKey || '' : '',
    language: !Array.isArray(props.element.content) ? props.element.content?.language || 'en' : 'en'
  })
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcription, setTranscription] = useState(
    !Array.isArray(props.element.content) ? props.element.content?.transcription || '' : ''
  )

  // Add console log to verify component is being rendered
  console.log('DynamicAudioComponent rendered:', {
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
          
          {/* Transcription UI for annotators */}
          {elementContent.transcribeEnabled && (
            <div className="mt-4 border-t pt-4 px-4 pb-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium">Transcription</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleTranscribe}
                  disabled={isTranscribing}
                >
                  {isTranscribing ? 'Transcribing...' : 'Auto-Transcribe'}
                </Button>
              </div>
              
              <Textarea
                value={transcription}
                onChange={(e) => handleTranscriptionChange(e.target.value)}
                placeholder="Listen to the audio and type your transcription here. You can also click 'Auto-Transcribe' for assistance."
                className="min-h-[120px] resize-y"
              />

            </div>
          )}
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