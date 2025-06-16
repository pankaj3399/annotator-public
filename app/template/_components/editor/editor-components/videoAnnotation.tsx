'use client';

import { EditorElement, useEditor } from '@/providers/editor/editor-provider';
import { cn } from '@/lib/utils';
import { Trash, Settings, X, Play, Pause, Upload, AlertCircle, ExternalLink } from 'lucide-react';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import PropertyPanel from '@/app/template/_components/editor/editor-components/propertypanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import clsx from 'clsx';

type Props = {
  element: EditorElement;
};

interface VideoAnnotation {
  id: string;
  startTime: number;
  endTime: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  points?: { x: number; y: number }[];
  label: string;
  color: string;
  shape: 'rectangle' | 'circle' | 'polygon' | 'point';
}

interface LabelCategory {
  id: string;
  name: string;
  color: string;
}

interface VideoAnnotationContent {
  src?: string;
  instructions?: string;
  labelCategories: LabelCategory[];
  annotations: VideoAnnotation[];
}

const VideoAnnotation = (props: Props) => {
  const { dispatch, state, pageDetails } = useEditor();
  const [showSettings, setShowSettings] = useState(false);
  const componentRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Video states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  
  // Drawing states
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentAnnotation, setCurrentAnnotation] = useState<VideoAnnotation | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<string>('');
  const [selectedShape, setSelectedShape] = useState<'rectangle' | 'circle' | 'polygon' | 'point'>('rectangle');
  const [polygonPoints, setPolygonPoints] = useState<{ x: number; y: number }[]>([]);
  const [isDrawingPolygon, setIsDrawingPolygon] = useState(false);

  const [elementContent, setElementContent] = useState<VideoAnnotationContent>({
    src: !Array.isArray(props.element.content) ? (props.element.content as any)?.src || '' : '',
    instructions: !Array.isArray(props.element.content) ? (props.element.content as any)?.instructions || 'Watch the video and annotate objects at specific timestamps.' : 'Watch the video and annotate objects at specific timestamps.',
    labelCategories: !Array.isArray(props.element.content) ? (props.element.content as any)?.labelCategories || [
      { id: '1', name: 'OBJECT', color: '#ff0000' },
      { id: '2', name: 'PERSON', color: '#00ff00' },
      { id: '3', name: 'VEHICLE', color: '#0000ff' }
    ] : [
      { id: '1', name: 'OBJECT', color: '#ff0000' },
      { id: '2', name: 'PERSON', color: '#00ff00' },
      { id: '3', name: 'VEHICLE', color: '#0000ff' }
    ],
    annotations: !Array.isArray(props.element.content) ? (props.element.content as any)?.annotations || [] : []
  });

  // Sync with element content changes
  useEffect(() => {
    const content = !Array.isArray(props.element.content) ? (props.element.content as any) : {};
    
    const newContent = {
      src: content?.src || '',
      instructions: content?.instructions || 'Watch the video and annotate objects at specific timestamps.',
      labelCategories: content?.labelCategories || [
        { id: '1', name: 'OBJECT', color: '#ff0000' },
        { id: '2', name: 'PERSON', color: '#00ff00' },
        { id: '3', name: 'VEHICLE', color: '#0000ff' }
      ],
      annotations: content?.annotations || []
    };

    setElementContent(newContent);
  }, [props.element.content]);

  // Handle clicks outside component
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!showSettings) return;
      if (componentRef.current && !componentRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSettings]);

  // Video event handlers
  const handleVideoLoad = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setVideoLoaded(true);
      setVideoError(null);
      console.log('✅ Video loaded successfully:', elementContent.src);
    }
  };

  const handleVideoError = () => {
    setVideoError(`Failed to load video: ${elementContent.src}`);
    setVideoLoaded(false);
    console.error('❌ Video loading error:', elementContent.src);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  // File upload handler
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast.error('Please select a video file');
      return;
    }

    // Validate file size (500MB limit)
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      toast.error('File size too large. Maximum size is 500MB');
      return;
    }

    setUploading(true);

    try {
      // Get signed URL from your S3 API
      const response = await fetch('/api/s3/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          fileSize: file.size
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadUrl, fileUrl } = await response.json();

      // Upload file to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload video');
      }

      // Update element content
      const updatedContent = { ...elementContent, src: fileUrl };
      setElementContent(updatedContent);

      dispatch({
        type: 'UPDATE_ELEMENT',
        payload: {
          elementDetails: {
            ...props.element,
            content: updatedContent
          }
        }
      });

      toast.success('Video uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload video');
    } finally {
      setUploading(false);
    }
  };

  // Mouse position relative to video
  const getMousePosition = (e: React.MouseEvent) => {
    if (!videoRef.current) return { x: 0, y: 0 };
    
    const rect = videoRef.current.getBoundingClientRect();
    const scaleX = videoRef.current.videoWidth / rect.width;
    const scaleY = videoRef.current.videoHeight / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  // Drawing handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!state.editor.liveMode || !selectedLabel || pageDetails.submitted || !videoLoaded) return;
    
    e.preventDefault();
    const pos = getMousePosition(e);
    
    if (selectedShape === 'point') {
      createPointAnnotation(pos);
      return;
    }
    
    if (selectedShape === 'polygon') {
      handlePolygonClick(pos);
      return;
    }
    
    setStartPoint(pos);
    setIsDrawing(true);
  };

  const createPointAnnotation = (pos: { x: number; y: number }) => {
    const selectedCategory = elementContent.labelCategories.find(cat => cat.name === selectedLabel);
    
    const newAnnotation: VideoAnnotation = {
      id: `annotation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      startTime: currentTime,
      endTime: currentTime,
      x: pos.x,
      y: pos.y,
      label: selectedLabel,
      color: selectedCategory?.color || '#ff0000',
      shape: 'point'
    };

    addAnnotation(newAnnotation);
  };

  const handlePolygonClick = (pos: { x: number; y: number }) => {
    if (!isDrawingPolygon) {
      setPolygonPoints([pos]);
      setIsDrawingPolygon(true);
    } else {
      setPolygonPoints(prev => [...prev, pos]);
    }
  };

  const finishPolygon = () => {
    if (polygonPoints.length < 3) return;
    
    const selectedCategory = elementContent.labelCategories.find(cat => cat.name === selectedLabel);
    const minX = Math.min(...polygonPoints.map(p => p.x));
    const minY = Math.min(...polygonPoints.map(p => p.y));
    
    const newAnnotation: VideoAnnotation = {
      id: `annotation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      startTime: currentTime,
      endTime: currentTime,
      x: minX,
      y: minY,
      points: polygonPoints,
      label: selectedLabel,
      color: selectedCategory?.color || '#ff0000',
      shape: 'polygon'
    };

    addAnnotation(newAnnotation);
    setPolygonPoints([]);
    setIsDrawingPolygon(false);
  };

  const cancelPolygon = () => {
    setPolygonPoints([]);
    setIsDrawingPolygon(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !startPoint || !selectedLabel || pageDetails.submitted) return;
    
    const pos = getMousePosition(e);
    const selectedCategory = elementContent.labelCategories.find(cat => cat.name === selectedLabel);
    
    if (selectedShape === 'rectangle') {
      setCurrentAnnotation({
        id: `temp-${Date.now()}`,
        startTime: currentTime,
        endTime: currentTime,
        x: Math.min(startPoint.x, pos.x),
        y: Math.min(startPoint.y, pos.y),
        width: Math.abs(pos.x - startPoint.x),
        height: Math.abs(pos.y - startPoint.y),
        label: selectedLabel,
        color: selectedCategory?.color || '#ff0000',
        shape: 'rectangle'
      });
    } else if (selectedShape === 'circle') {
      const radius = Math.sqrt(
        Math.pow(pos.x - startPoint.x, 2) + Math.pow(pos.y - startPoint.y, 2)
      );
      setCurrentAnnotation({
        id: `temp-${Date.now()}`,
        startTime: currentTime,
        endTime: currentTime,
        x: startPoint.x,
        y: startPoint.y,
        radius: radius,
        label: selectedLabel,
        color: selectedCategory?.color || '#ff0000',
        shape: 'circle'
      });
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDrawing || !currentAnnotation) {
      setIsDrawing(false);
      setStartPoint(null);
      setCurrentAnnotation(null);
      return;
    }

    if (selectedShape === 'rectangle' && (currentAnnotation.width! < 10 || currentAnnotation.height! < 10)) {
      setIsDrawing(false);
      setStartPoint(null);
      setCurrentAnnotation(null);
      return;
    }

    if (selectedShape === 'circle' && currentAnnotation.radius! < 10) {
      setIsDrawing(false);
      setStartPoint(null);
      setCurrentAnnotation(null);
      return;
    }

    const newAnnotation: VideoAnnotation = {
      ...currentAnnotation,
      id: `annotation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    addAnnotation(newAnnotation);
    setIsDrawing(false);
    setStartPoint(null);
    setCurrentAnnotation(null);
  };

  const addAnnotation = (annotation: VideoAnnotation) => {
    const updatedContent = {
      ...elementContent,
      annotations: [...elementContent.annotations, annotation]
    };
    
    setElementContent(updatedContent);
    
    dispatch({
      type: 'UPDATE_ELEMENT',
      payload: {
        elementDetails: {
          ...props.element,
          content: updatedContent
        }
      }
    });
  };

  const deleteAnnotation = (annotationId: string) => {
    const updatedContent = {
      ...elementContent,
      annotations: elementContent.annotations.filter(ann => ann.id !== annotationId)
    };
    
    setElementContent(updatedContent);
    
    dispatch({
      type: 'UPDATE_ELEMENT',
      payload: {
        elementDetails: {
          ...props.element,
          content: updatedContent
        }
      }
    });
  };

  // Component event handlers
  const handleOnClickBody = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({
      type: 'CHANGE_CLICKED_ELEMENT',
      payload: { elementDetails: props.element },
    });
  };

  const handleDeleteElement = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({
      type: 'DELETE_ELEMENT',
      payload: { elementDetails: props.element },
    });
  };

  const handleToggleSettings = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({
      type: 'CHANGE_CLICKED_ELEMENT',
      payload: { elementDetails: props.element },
    });
    setShowSettings(prev => !prev);
  };

  const handlePropertyPanelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({
      type: 'CHANGE_CLICKED_ELEMENT',
      payload: { elementDetails: props.element },
    });
  };

  // Render annotations overlay
  const renderAnnotations = () => {
    if (!videoRef.current || !videoLoaded) return null;

    const rect = videoRef.current.getBoundingClientRect();
    const scaleX = rect.width / videoRef.current.videoWidth;
    const scaleY = rect.height / videoRef.current.videoHeight;

    // Filter annotations for current time (±0.5 seconds)
    const visibleAnnotations = elementContent.annotations.filter(annotation => 
      currentTime >= annotation.startTime - 0.5 && currentTime <= annotation.endTime + 0.5
    );

    // Add current drawing annotation
    const allAnnotations = [...visibleAnnotations];
    if (currentAnnotation) allAnnotations.push(currentAnnotation);

    return allAnnotations.map((annotation) => {
      const commonProps = {
        key: annotation.id,
        className: "absolute pointer-events-none",
        style: {
          borderColor: annotation.color,
          backgroundColor: `${annotation.color}20`
        }
      };

      let shapeElement;
      let labelX = annotation.x * scaleX;
      let labelY = annotation.y * scaleY - 24;

      switch (annotation.shape) {
        case 'rectangle':
          shapeElement = (
            <div
              {...commonProps}
              className="absolute border-2 pointer-events-none"
              style={{
                left: annotation.x * scaleX,
                top: annotation.y * scaleY,
                width: (annotation.width || 0) * scaleX,
                height: (annotation.height || 0) * scaleY,
                borderColor: annotation.color,
                backgroundColor: `${annotation.color}20`
              }}
            />
          );
          break;

        case 'circle':
          const radius = (annotation.radius || 0) * Math.min(scaleX, scaleY);
          shapeElement = (
            <div
              {...commonProps}
              className="absolute border-2 rounded-full pointer-events-none"
              style={{
                left: annotation.x * scaleX - radius,
                top: annotation.y * scaleY - radius,
                width: radius * 2,
                height: radius * 2,
                borderColor: annotation.color,
                backgroundColor: `${annotation.color}20`
              }}
            />
          );
          labelX = annotation.x * scaleX - radius;
          labelY = annotation.y * scaleY - radius - 24;
          break;

        case 'polygon':
          if (annotation.points && annotation.points.length >= 3) {
            const pathData = annotation.points
              .map((point, i) => `${i === 0 ? 'M' : 'L'} ${point.x * scaleX} ${point.y * scaleY}`)
              .join(' ') + ' Z';
            
            shapeElement = (
              <svg
                {...commonProps}
                className="absolute pointer-events-none"
                style={{
                  left: 0,
                  top: 0,
                  width: '100%',
                  height: '100%'
                }}
              >
                <path
                  d={pathData}
                  stroke={annotation.color}
                  strokeWidth="2"
                  fill={`${annotation.color}20`}
                />
              </svg>
            );
          }
          break;

        case 'point':
          shapeElement = (
            <div
              {...commonProps}
              className="absolute border-2 rounded-full pointer-events-none"
              style={{
                left: annotation.x * scaleX - 6,
                top: annotation.y * scaleY - 6,
                width: 12,
                height: 12,
                borderColor: annotation.color,
                backgroundColor: annotation.color
              }}
            />
          );
          labelX = annotation.x * scaleX - 6;
          labelY = annotation.y * scaleY - 30;
          break;

        default:
          return null;
      }

      return (
        <div key={annotation.id}>
          {shapeElement}
          <div
            className="absolute px-2 py-1 text-xs font-bold text-white rounded pointer-events-none"
            style={{ 
              left: labelX,
              top: labelY,
              backgroundColor: annotation.color 
            }}
          >
            {annotation.label}
            {annotation.id !== currentAnnotation?.id && state.editor.liveMode && !pageDetails.submitted && (
              <button
                className="ml-2 text-white hover:text-red-200 pointer-events-auto"
                onClick={() => deleteAnnotation(annotation.id)}
              >
                ×
              </button>
            )}
          </div>
        </div>
      );
    });
  };

  const isSelected = state.editor.selectedElement.id === props.element.id;
  const isLiveMode = state.editor.liveMode;

  // Format time for display
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={componentRef}
      style={props.element.styles}
      onClick={handleOnClickBody}
      className={clsx(
        'p-[2px] w-full m-[5px] relative text-[16px] transition-all',
        {
          '!border-blue-500': isSelected,
          '!border-solid': isSelected,
          'border-dashed border-[1px] border-slate-300': !isLiveMode,
        }
      )}
    >
      {isSelected && !isLiveMode && (
        <div className="absolute -top-[25px] right-[0px] z-50">
          <div className="bg-primary px-2.5 py-1 text-xs font-bold rounded-t-lg !text-white flex items-center gap-2">
            {elementContent.src && (
              <ExternalLink
                className="cursor-pointer hover:text-blue-200"
                size={16}
                onClick={() => window.open(elementContent.src, '_blank')}
                title="Open video in new tab"
              />
            )}
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

      <div className="space-y-4">
        {/* Instructions - Show in live mode */}
        {isLiveMode && elementContent.instructions && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">{elementContent.instructions}</p>
          </div>
        )}

        {/* Video Upload/Display */}
        {!isLiveMode && !elementContent.src ? (
          <div className="w-full h-64 bg-muted rounded-lg flex flex-col items-center justify-center">
            <div className="text-center">
              <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Video</h3>
              <p className="text-sm text-gray-500 mb-4">
                Upload a video file to create annotation tasks
              </p>
              <Button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : 'Choose Video File'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>
        ) : elementContent.src ? (
          <div className="relative">
            {/* Video Player */}
            <div className="relative bg-black rounded-lg overflow-hidden">
              {videoError ? (
                <div className="w-full h-64 bg-red-50 border border-red-200 rounded-lg flex flex-col items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-500 mb-2" />
                  <div className="text-sm text-red-600 text-center">Failed to load video</div>
                  <div className="text-xs text-red-500 text-center break-all max-w-[300px]">
                    {elementContent.src}
                  </div>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    src={elementContent.src}
                    className="w-full h-auto"
                    onLoadedMetadata={handleVideoLoad}
                    onTimeUpdate={handleTimeUpdate}
                    onError={handleVideoError}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    style={{
                      cursor: (isLiveMode && selectedLabel && !pageDetails.submitted) ? 'crosshair' : 'default'
                    }}
                  />
                  {renderAnnotations()}
                </>
              )}
            </div>

            {/* Video Controls */}
            {videoLoaded && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePlayPause}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  <span className="text-sm font-mono">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>
                
                {/* Timeline */}
                <div className="relative">
                  <input
                    type="range"
                    min={0}
                    max={duration}
                    value={currentTime}
                    onChange={(e) => handleSeek(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  {/* Annotation markers on timeline */}
                  {elementContent.annotations.map((annotation) => (
                    <div
                      key={annotation.id}
                      className="absolute top-0 w-1 h-full rounded"
                      style={{
                        left: `${(annotation.startTime / duration) * 100}%`,
                        backgroundColor: annotation.color
                      }}
                      title={`${annotation.label} at ${formatTime(annotation.startTime)}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Shape Selector - Only in live mode */}
        {isLiveMode && !pageDetails.submitted && elementContent.src && videoLoaded && (
          <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">Select shape:</span>
            {[
              { value: 'rectangle', label: '📦 Rectangle', icon: '⬜' },
              { value: 'circle', label: '⭕ Circle', icon: '⭕' },
              { value: 'polygon', label: '🔷 Polygon', icon: '🔷' },
              { value: 'point', label: '📍 Point', icon: '•' }
            ].map((shape) => (
              <button
                key={shape.value}
                onClick={() => {
                  setSelectedShape(shape.value as any);
                  if (isDrawingPolygon) {
                    cancelPolygon();
                  }
                }}
                className={clsx(
                  'px-3 py-1 text-xs font-medium rounded border-2 transition-all',
                  selectedShape === shape.value
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-100'
                )}
              >
                {shape.icon} {shape.label.split(' ')[1]}
              </button>
            ))}
          </div>
        )}

        {/* Label Selector - Only in live mode */}
        {isLiveMode && !pageDetails.submitted && elementContent.src && videoLoaded && elementContent.labelCategories.length > 0 && (
          <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">Select label:</span>
            {elementContent.labelCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedLabel(category.name)}
                className={clsx(
                  'px-3 py-1 text-xs font-medium rounded border-2 transition-all',
                  selectedLabel === category.name
                    ? 'text-white'
                    : 'text-gray-700 bg-white hover:bg-gray-100'
                )}
                style={{
                  borderColor: category.color,
                  backgroundColor: selectedLabel === category.name ? category.color : undefined
                }}
              >
                {category.name}
              </button>
            ))}
          </div>
        )}

        {/* Polygon Instructions */}
        {isLiveMode && !pageDetails.submitted && selectedShape === 'polygon' && elementContent.src && videoLoaded && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              🔷 <strong>Polygon Mode:</strong> Click to add points. You need at least 3 points to create a polygon.
              {isDrawingPolygon && (
                <span className="block mt-2">
                  Current points: {polygonPoints.length}
                  <button
                    onClick={finishPolygon}
                    disabled={polygonPoints.length < 3}
                    className="ml-2 px-2 py-1 bg-green-500 text-white text-xs rounded disabled:bg-gray-300"
                  >
                    Finish ({polygonPoints.length}/3+)
                  </button>
                  <button
                    onClick={cancelPolygon}
                    className="ml-1 px-2 py-1 bg-red-500 text-white text-xs rounded"
                  >
                    Cancel
                  </button>
                </span>
              )}
            </p>
          </div>
        )}

        {/* Annotation List */}
        {isLiveMode && elementContent.annotations.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">
              Annotations ({elementContent.annotations.length})
              {pageDetails.submitted && <span className="text-xs text-gray-500 ml-2">(Review Mode)</span>}
            </h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {elementContent.annotations.map((annotation, index) => (
                <div
                  key={annotation.id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: annotation.color }}
                    />
                    <span className="font-medium">{annotation.label}</span>
                    <span className="text-gray-500 text-xs">
                      at {formatTime(annotation.startTime)}
                      {annotation.shape === 'rectangle' && ` 📦 ${Math.round(annotation.width || 0)}×${Math.round(annotation.height || 0)}`}
                      {annotation.shape === 'circle' && ` ⭕ r=${Math.round(annotation.radius || 0)}`}
                      {annotation.shape === 'polygon' && ` 🔷 ${annotation.points?.length || 0} points`}
                      {annotation.shape === 'point' && ` 📍 (${Math.round(annotation.x)}, ${Math.round(annotation.y)})`}
                    </span>
                  </div>
                  {/* Only show delete button if not submitted */}
                  {!pageDetails.submitted && (
                    <button
                      onClick={() => deleteAnnotation(annotation.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Editor Mode Preview */}
        {!isLiveMode && (
          <div className="p-4 bg-gray-50 rounded-lg text-center">
            <div className="text-sm text-gray-600 mb-2">Video Annotation Element</div>
            <div className="text-xs text-gray-500">
              {elementContent.labelCategories.length} label categories configured
              {elementContent.src && (
                <span className="block mt-1 text-green-600">
                  Video uploaded: {elementContent.src.split('/').pop()}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Property Panel */}
      {isSelected && showSettings && !isLiveMode && (
        <div 
          className="absolute left-0 right-0 mt-2 z-50 bg-white border rounded-md shadow-lg"
          onClick={handlePropertyPanelClick}
        >
          <div className="flex items-center justify-between p-3 border-b">
            <h3 className="font-medium">Video Annotation Settings</h3>
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
  );
};

export default VideoAnnotation;