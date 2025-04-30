'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { EditorBtns } from '@/lib/constants'
import { EditorElement, useEditor } from '@/providers/editor/editor-provider'
import { useUploadThing } from '@/utils/uploadthing'
import clsx from 'clsx'
import { Send, Trash, Settings, X } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'
import { useReactMediaRecorder } from "react-media-recorder"
import ReactPlayer from 'react-player'
import { toast } from 'sonner'
import PropertyPanel from '@/app/template/_components/editor/editor-components/propertypanel'

type Props = {
  element: EditorElement
}

const RecordVideoComponent = (props: Props) => {
  const { dispatch, state } = useEditor()
  // Local state to track if settings panel is visible for this specific element
  const [showSettings, setShowSettings] = useState(false)
  // Refs to detect clicks outside
  const componentRef = useRef<HTMLDivElement>(null)
  
  const [elementContent, setElementContent] = React.useState({
    src: !Array.isArray(props.element.content) ? props.element.content?.src || '' : ''
  })
  const [loading, setLoading] = React.useState(false)
  
  const { status, startRecording, stopRecording, mediaBlobUrl, previewStream } = useReactMediaRecorder({ video: true })
  const videoRef = useRef<HTMLVideoElement>(null)

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
      ref={componentRef}
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

      {/* Inline Property Panel */}
      {isSelected && showSettings && !isLiveMode && (
        <div 
          className="absolute left-0 right-0 mt-2 z-50 bg-white border rounded-md shadow-lg"
          onClick={handlePropertyPanelClick}
        >
          <div className="flex items-center justify-between p-3 border-b">
            <h3 className="font-medium">Video Recorder Settings</h3>
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

export default RecordVideoComponent