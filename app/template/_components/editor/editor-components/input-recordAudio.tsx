import React, { useEffect, useRef, useState } from 'react'
import { Button } from "@/components/ui/button"
import { CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import useStatus from '@/hooks/use-status'
import useTimer from '@/hooks/use-timer'
import { EditorBtns } from '@/lib/constants'
import { EditorElement, useEditor } from '@/providers/editor/editor-provider'
import { useUploadThing } from '@/utils/uploadthing'
import clsx from 'clsx'
import { Mic, Pause, Play, RotateCcw, Send, Square, Trash, Sparkles, Volume2, Settings, X } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useReactMediaRecorder } from "react-media-recorder"
import { toast } from "sonner"
import { Checkbox } from '@/components/ui/checkbox'
import axios from 'axios'
import PropertyPanel from '@/app/template/_components/editor/editor-components/propertypanel'
import { isProjectManager } from '@/lib/userRoles'

interface Props {
  element: EditorElement
}


// Custom audio player component with proper types
const CustomAudioPlayer: React.FC<{ src: string; onEnded?: () => void }> = ({ src, onEnded }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
      setIsLoading(false)
    }

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      onEnded?.()
    }

    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [onEnded])

  const togglePlayPause = () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play().catch(error => {
        console.error('Error playing audio:', error)
        toast.error('Error playing audio')
      })
    }
    setIsPlaying(!isPlaying)
  }

  const handleProgressChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return

    const time = parseFloat(event.target.value)
    audioRef.current.currentTime = time
    setCurrentTime(time)
  }

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return

    const newVolume = parseFloat(event.target.value)
    audioRef.current.volume = newVolume
    setVolume(newVolume)
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="w-full bg-background rounded-lg shadow-sm border p-4">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        className="hidden"
      />
      
      {isLoading ? (
        <div className="flex justify-center items-center h-20">
          <div className="animate-pulse">Loading audio...</div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="outline" 
              size="sm"
              onClick={togglePlayPause}
              className="w-24"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4 mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {isPlaying ? 'Pause' : 'Play'}
            </Button>
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={handleVolumeChange}
                className="w-20"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Progress 
              value={(currentTime / duration) * 100} 
              className="h-2 cursor-pointer"
            />
            <input
              type="range"
              min="0"
              max={duration}
              value={currentTime}
              onChange={handleProgressChange}
              className="w-full h-1 appearance-none bg-transparent [&::-webkit-slider-thumb]:hidden"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// WebM to MP3 converter utility
const convertWebMToMP3 = async (webmBlob: Blob): Promise<File> => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const arrayBuffer = await webmBlob.arrayBuffer()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    
    const offlineContext = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    )
    
    const source = offlineContext.createBufferSource()
    source.buffer = audioBuffer
    source.connect(offlineContext.destination)
    source.start()
    
    const renderedBuffer = await offlineContext.startRendering()
    
    // Convert to 16-bit PCM WAV
    const numberOfChannels = renderedBuffer.numberOfChannels
    const length = renderedBuffer.length * numberOfChannels * 2
    const buffer = new ArrayBuffer(44 + length)
    const view = new DataView(buffer)
    
    // WAV header
    const writeString = (view: DataView, offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }
    
    writeString(view, 0, 'RIFF')
    view.setUint32(4, 36 + length, true)
    writeString(view, 8, 'WAVE')
    writeString(view, 12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, numberOfChannels, true)
    view.setUint32(24, renderedBuffer.sampleRate, true)
    view.setUint32(28, renderedBuffer.sampleRate * numberOfChannels * 2, true)
    view.setUint16(32, numberOfChannels * 2, true)
    view.setUint16(34, 16, true)
    writeString(view, 36, 'data')
    view.setUint32(40, length, true)
    
    const samples = new Float32Array(renderedBuffer.length * numberOfChannels)
    let offset = 44
    for (let i = 0; i < renderedBuffer.length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = renderedBuffer.getChannelData(channel)[i]
        const clipped = Math.max(-1, Math.min(1, sample))
        view.setInt16(offset, clipped < 0 ? clipped * 0x8000 : clipped * 0x7FFF, true)
        offset += 2
      }
    }
    
    const wavBlob = new Blob([buffer], { type: 'audio/wav' })
    return new File([wavBlob], 'audio.mp3', { type: 'audio/mp3' })
  } catch (error) {
    console.error('Error converting audio:', error)
    throw new Error('Failed to convert audio format')
  }
}

const InputRecordAudioComponent: React.FC<Props> = (props) => {
  const { dispatch, state } = useEditor()
  // Local state to track if settings panel is visible for this specific element
  const [showSettings, setShowSettings] = useState(false)
  // Refs to detect clicks outside
  const componentRef = useRef<HTMLDivElement>(null)
  
  const [elementContent, setElementContent] = useState({
    src: props.element.content && !Array.isArray(props.element.content) ? props.element.content.src || '' : ''
  })
  const [duration, setDuration] = useState(0)
  const [loading, setLoading] = useState(false)
  const [cleanVoiceLoading, setCleanVoiceLoading] = useState(false)
  const [cleanVoiceDialogOpen, setCleanVoiceDialogOpen] = useState(false)
  const [selectedCleanVoiceOptions, setSelectedCleanVoiceOptions] = useState<string[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  
  const { status, startRecording, stopRecording, mediaBlobUrl } = useReactMediaRecorder({ 
    audio: true,
    mediaRecorderOptions: {
      mimeType: 'audio/webm'
    }
  })
  const { setRunning } = useTimer()
  const { status: STATUS, submitted } = useStatus()
  const session = useSession()

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

  const { startUpload } = useUploadThing("audioUploader", {
    onClientUploadComplete: async (data) => {
      if (!data?.[0]?.url) {
        toast.error('Upload failed - no URL received')
        return
      }
      
      toast.success('Recording uploaded successfully')
      
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
    onUploadError: (error) => {
      console.error('Upload error:', error)
      toast.error("Error occurred while uploading")
      setLoading(false)
      setRunning(true)
    },
    onUploadBegin: () => {
      setRunning(false)
    },
  })

  const handleStopRrecording= ()=>{
    toast.success("Please click on process recording to process further")
    stopRecording()

  }
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
        setDuration(prev => prev + 1)
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

  const handleRecordingComplete = async (blobUrl: string) => {
    if (!blobUrl) {
      toast.error('No recording available')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(blobUrl)
      const webmBlob = await response.blob()

      const mp3File = await convertWebMToMP3(webmBlob)
      await startUpload([mp3File])
    } catch (error) {
      console.error('Error processing recording:', error)
      toast.error('Failed to process recording')
      setLoading(false)
    }
  }

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

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleCleanVoiceOptionToggle = (option: string) => {
    setSelectedCleanVoiceOptions(prev => 
      prev.includes(option) 
        ? prev.filter(item => item !== option)
        : [...prev, option]
    )
  }
  const cleanVoiceEdit = async (fileUrl: string) => {
    if (!fileUrl) {
      toast.error("No file URL provided");
      return;
    }
  
    setCleanVoiceLoading(true);
    try {
      // Step 1: Initiate clean voice edit (job id is returned)
      const response = await axios.post("/api/cleanVoice", {
        fileUrl,
        long_silences: true,
        fillers: true,
        remove_noise: true,
      });
      
      if (!response.data || !response.data.id) {
        toast.error("Failed to start clean voice process");
        return;
      }
      
  
      const jobId = response.data.id;
      let jobStatus = "PENDING";
      let statusData: any = null;
  
      // Step 2: Poll for the job status until it succeeds or fails
      while (jobStatus !== "SUCCESS" && jobStatus !== "FAILURE") {
        const checkStatusResponse = await axios.get(`/api/checkJobStatus?jobId=${jobId}`);
  
        statusData = checkStatusResponse.data;
        jobStatus = statusData.status;
  
        if (jobStatus === "PENDING" || jobStatus === "PROCESSING") {
          // Wait for 5 seconds before checking the status again
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
  
      // Check if the job is successful and handle the file download/upload
      if (jobStatus === "SUCCESS" && statusData.result.download_url) {
        // Step 3: Delete the previously stored file from UploadThing
        const existingFileUrl = fileUrl; // Use the previous file URL to extract the file key
  
        // Send the DELETE request using axios
        const deleteFileResponse = await axios.delete('/api/deleteFile',{
          params:{
           fileUrl: existingFileUrl, // Pass the file URL to the delete API
        }

        } );
  
        if (deleteFileResponse.status !== 200) {
          toast.error("Failed to delete the previous file");
          return;
        }
  
        // Step 4: Download the new file using the download URL
        const downloadUrl = statusData.result.download_url;
        const fileResponse = await fetch(downloadUrl);
        const audioBlob = await fileResponse.blob();
  
        // Convert the Blob to a File object
        const file = new File([audioBlob], "cleaned_audio.wav", {
          type: "audio/wav",
        });
  
        // Step 5: Upload the new File using the startUpload function
        await startUpload([file]);
        toast.success("Audio cleaned successfully");
  
        setCleanVoiceDialogOpen(false);
      } else {
        toast.error("Failed to clean audio or job not successful");
      }
    } catch (error) {
      console.error("Error cleaning audio:", error);
      toast.error("Error while cleaning audio");
    } finally {
      setCleanVoiceLoading(false);
    }
  };
  
  const isSelected = state.editor.selectedElement.id === props.element.id
  const isLiveMode = state.editor.liveMode

  return (
    <div
      ref={componentRef}
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

      {elementContent.src === '' ? (
        <div className="w-full">
          <CardContent className="p-6">
            <div className="text-center mb-4">
              <span className="text-3xl font-bold text-primary">
                {formatDuration(duration)}
              </span>
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              {status !== 'recording' && !mediaBlobUrl && (
                <Button 
                  onClick={startRecording} 
                  disabled={isProjectManager(session.data?.user.role)}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Mic className="mr-2 h-4 w-4" /> Start Recording
                </Button>
              )}
              {status === 'recording' && (
                <Button 
                  onClick={handleStopRrecording} 
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary/10"
                >
                  <Square className="mr-2 h-4 w-4" /> Stop
                </Button>
              )}
              {status !== 'recording' && mediaBlobUrl && (
                <div className="w-full space-y-4">
                  <div className="flex justify-center gap-4">
                    <Button 
                      onClick={reRecord} 
                      variant="outline" 
                      className="border-primary text-primary hover:bg-primary/10"
                    >
                      <RotateCcw className="mr-2 h-4 w-4" /> Re-record
                    </Button>
                    <Button 
                      onClick={() => handleRecordingComplete(mediaBlobUrl)} 
                      disabled={loading || cleanVoiceLoading}
                      className="bg-primary hover:bg-primary/90"
                    >
                      <Send className="mr-2 h-4 w-4" /> 
                      {loading || cleanVoiceLoading ? 'Processing...' : ' Process Recording'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
            {!isLiveMode && (
              <div className="flex mb-0 mt-4 justify-center text-sm text-muted-foreground">
                Audio Recording Input
              </div>
            )}
          </CardContent>
        </div>
      ) : (
        <div className="w-full relative">
          <CustomAudioPlayer 
            src={elementContent.src} 
            onEnded={() => console.log('Audio playback ended')}
          />
          
          <Dialog open={cleanVoiceDialogOpen} onOpenChange={setCleanVoiceDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="absolute bottom-2 right-2"
                disabled={cleanVoiceLoading}
              >
                <Sparkles className="mr-2 h-4 w-4" /> Clean Audio
              </Button>
            </DialogTrigger>
            <DialogContent>
      <DialogHeader>
        <DialogTitle>Clean Voice Options</DialogTitle>
      </DialogHeader>
      <div className="space-y-6 p-4">
        <div className="flex flex-col space-y-4">
          {/* Background Noise Option */}
          {props.element.content.backgroundNoise && (
            <div className="flex items-center space-x-3">
              <Checkbox
                id="backgroundNoise"
                checked={selectedCleanVoiceOptions.includes("backgroundNoise")}
                onCheckedChange={() => handleCleanVoiceOptionToggle("backgroundNoise")}
              />
              <label htmlFor="backgroundNoise" className="text-lg font-medium cursor-pointer">
                Background Noise Removal
              </label>
            </div>
          )}

          {/* Silence Removal Option */}
          {props.element.content.silenceRemoval && (
            <div className="flex items-center space-x-3">
              <Checkbox
                id="silenceRemoval"
                checked={selectedCleanVoiceOptions.includes("silenceRemoval")}
                onCheckedChange={() => handleCleanVoiceOptionToggle("silenceRemoval")}
              />
              <label htmlFor="silenceRemoval" className="text-lg font-medium cursor-pointer">
                Silence Removal
              </label>
            </div>
          )}

          {/* Filler Word Removal Option */}
          {props.element.content.fillerWordRemoval && (
            <div className="flex items-center space-x-3">
              <Checkbox
                id="fillerWordRemoval"
                checked={selectedCleanVoiceOptions.includes("fillerWordRemoval")}
                onCheckedChange={() => handleCleanVoiceOptionToggle("fillerWordRemoval")}
              />
              <label htmlFor="fillerWordRemoval" className="text-lg font-medium cursor-pointer">
                Filler Word Removal
              </label>
            </div>
          )}
        </div>

        <Button
          onClick={() => cleanVoiceEdit(elementContent.src)}
          disabled={cleanVoiceLoading || selectedCleanVoiceOptions.length === 0}
          className="w-full py-3 px-4 text-lg font-medium rounded-lg transition duration-200 bg-blue-500 text-white disabled:bg-gray-400 disabled:text-gray-600"
        >
          {cleanVoiceLoading ? (
            <div className="flex items-center">
              <span className="mr-2">Processing</span>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            </div>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" /> Clean with AI
            </>
          )}
        </Button>
      </div>
    </DialogContent>
          </Dialog>
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

export default InputRecordAudioComponent