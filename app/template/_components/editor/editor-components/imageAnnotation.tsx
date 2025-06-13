'use client';

import { EditorElement, useEditor } from '@/providers/editor/editor-provider';
import { cn } from '@/lib/utils';
import { Trash, Settings, X, Plus, Minus, AlertCircle } from 'lucide-react';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import PropertyPanel from '@/app/template/_components/editor/editor-components/propertypanel';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import clsx from 'clsx';

type Props = {
  element: EditorElement;
};

interface Annotation {
  id: string;
  x: number;
  y: number;
  width?: number; // Optional for non-rectangle shapes
  height?: number; // Optional for non-rectangle shapes
  radius?: number; // For circles
  points?: { x: number; y: number }[]; // For polygons
  label: string;
  color: string;
  shape: 'rectangle' | 'circle' | 'polygon' | 'point';
}

interface LabelCategory {
  id: string;
  name: string;
  color: string;
}

interface AnnotationContent {
  src?: string;
  instructions?: string;
  labelCategories: LabelCategory[]; // Remove ? to make it always an array
  annotations: Annotation[]; // Remove ? to make it always an array
}

const ImageAnnotation = (props: Props) => {
  const { dispatch, state, pageDetails } = useEditor(); // Add pageDetails here
  const [showSettings, setShowSettings] = useState(false);
  const componentRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentBox, setCurrentBox] = useState<Annotation | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<string>('');
  const [selectedShape, setSelectedShape] = useState<'rectangle' | 'circle' | 'polygon' | 'point'>('rectangle');
  const [polygonPoints, setPolygonPoints] = useState<{ x: number; y: number }[]>([]);
  const [isDrawingPolygon, setIsDrawingPolygon] = useState(false);
  
  // Image loading states
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  const [elementContent, setElementContent] = useState<AnnotationContent>({
    src: !Array.isArray(props.element.content) ? (props.element.content as any)?.src || '' : '',
    instructions: !Array.isArray(props.element.content) ? (props.element.content as any)?.instructions || 'Draw bounding boxes around the objects and select the appropriate label.' : 'Draw bounding boxes around the objects and select the appropriate label.',
    labelCategories: !Array.isArray(props.element.content) ? (props.element.content as any)?.labelCategories || [
      { id: '1', name: 'Label1', color: '#ff0000' },
      { id: '2', name: 'Label2', color: '#00ff00' }
    ] : [
      { id: '1', name: 'Label1', color: '#ff0000' },
      { id: '2', name: 'Label2', color: '#00ff00' }
    ],
    annotations: !Array.isArray(props.element.content) ? (props.element.content as any)?.annotations || [] : []
  });

  // Add this effect to reset image state when URL changes
  useEffect(() => {
    // Reset image states when src changes
    setImageLoading(false);
    setImageError(null);
    setImageLoaded(false);
    console.log('🔄 Image URL changed, resetting states:', elementContent.src);
  }, [elementContent.src]);
  useEffect(() => {
    const content = !Array.isArray(props.element.content) ? (props.element.content as any) : {};
    
    // Only update if there are actual changes to prevent infinite loops
    const newContent = {
      src: content?.src || '',
      instructions: content?.instructions || 'Draw bounding boxes around the objects and select the appropriate label.',
      labelCategories: content?.labelCategories || [
        { id: '1', name: 'Label1', color: '#ff0000' },
        { id: '2', name: 'Label2', color: '#00ff00' }
      ],
      annotations: content?.annotations || []
    };

    // Use JSON.stringify for deep comparison to prevent unnecessary updates
    const currentContentString = JSON.stringify(elementContent);
    const newContentString = JSON.stringify(newContent);
    
    if (currentContentString !== newContentString) {
      console.log('ImageAnnotation: Content changed, updating local state');
      setElementContent(newContent);
    }
  }, [props.element.content]); // Only watch for content changes from PropertyPanel

  // Handle clicks outside the component
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

  // Image loading handlers
  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(null);
    setImageLoaded(true);
    console.log('✅ Image loaded successfully:', elementContent.src);
    
    if (imageRef.current) {
      setImageDimensions({
        width: imageRef.current.clientWidth,
        height: imageRef.current.clientHeight
      });
      console.log('📐 Image dimensions:', {
        natural: { width: imageRef.current.naturalWidth, height: imageRef.current.naturalHeight },
        display: { width: imageRef.current.clientWidth, height: imageRef.current.clientHeight }
      });
    }
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setImageLoading(false);
    setImageLoaded(false);
    const errorMsg = `Failed to load image: ${elementContent.src}`;
    setImageError(errorMsg);
    console.error('❌ Image loading error:', errorMsg, e);
    console.error('🔍 Error details:', {
      src: elementContent.src,
      isValidUrl: isValidUrl(elementContent.src||''),
      isLiveMode,
      event: e
    });
  };

  const handleImageLoadStart = () => {
    setImageLoading(true);
    setImageError(null);
    console.log('🔄 Started loading image:', elementContent.src);
  };

  // Get mouse position relative to image
  const getMousePosition = (e: React.MouseEvent) => {
    if (!imageRef.current) return { x: 0, y: 0 };
    
    const rect = imageRef.current.getBoundingClientRect();
    const scaleX = imageRef.current.naturalWidth / rect.width;
    const scaleY = imageRef.current.naturalHeight / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  // Mouse event handlers for drawing
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only allow drawing in live mode when not submitted (not in review mode)
    if (!state.editor.liveMode || !selectedLabel || pageDetails.submitted) return;
    
    e.preventDefault();
    const pos = getMousePosition(e);
    
    if (selectedShape === 'point') {
      // For points, create annotation immediately
      createPointAnnotation(pos);
      return;
    }
    
    if (selectedShape === 'polygon') {
      handlePolygonClick(pos);
      return;
    }
    
    // For rectangle and circle
    setStartPoint(pos);
    setIsDrawing(true);
  };

  const createPointAnnotation = (pos: { x: number; y: number }) => {
    const selectedCategory = (elementContent.labelCategories || []).find(cat => cat.name === selectedLabel);
    
    const newAnnotation: Annotation = {
      id: `annotation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      x: pos.x,
      y: pos.y,
      label: selectedLabel,
      color: selectedCategory?.color || '#ff0000',
      shape: 'point'
    };

    const updatedAnnotations = [...(elementContent.annotations || []), newAnnotation];
    const updatedContent = { ...elementContent, annotations: updatedAnnotations };
    
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

  const handlePolygonClick = (pos: { x: number; y: number }) => {
    if (!isDrawingPolygon) {
      // Start new polygon
      setPolygonPoints([pos]);
      setIsDrawingPolygon(true);
    } else {
      // Add point to current polygon
      setPolygonPoints(prev => [...prev, pos]);
    }
  };

  const finishPolygon = () => {
    if (polygonPoints.length < 3) return; // Need at least 3 points for a polygon
    
    const selectedCategory = (elementContent.labelCategories || []).find(cat => cat.name === selectedLabel);
    
    // Calculate bounding box for the polygon
    const minX = Math.min(...polygonPoints.map(p => p.x));
    const minY = Math.min(...polygonPoints.map(p => p.y));
    
    const newAnnotation: Annotation = {
      id: `annotation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      x: minX,
      y: minY,
      points: polygonPoints,
      label: selectedLabel,
      color: selectedCategory?.color || '#ff0000',
      shape: 'polygon'
    };

    const updatedAnnotations = [...(elementContent.annotations || []), newAnnotation];
    const updatedContent = { ...elementContent, annotations: updatedAnnotations };
    
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

    // Reset polygon state
    setPolygonPoints([]);
    setIsDrawingPolygon(false);
  };

  const cancelPolygon = () => {
    setPolygonPoints([]);
    setIsDrawingPolygon(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Only allow drawing in live mode when not submitted (not in review mode)
    if (!isDrawing || !startPoint || !selectedLabel || pageDetails.submitted) return;
    
    const pos = getMousePosition(e);
    const selectedCategory = (elementContent.labelCategories || []).find(cat => cat.name === selectedLabel);
    
    if (selectedShape === 'rectangle') {
      setCurrentBox({
        id: `temp-${Date.now()}`,
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
      setCurrentBox({
        id: `temp-${Date.now()}`,
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
    if (!isDrawing || !currentBox) {
      setIsDrawing(false);
      setStartPoint(null);
      setCurrentBox(null);
      return;
    }

    // Check minimum size for rectangles and circles
    if (selectedShape === 'rectangle' && (currentBox.width! < 10 || currentBox.height! < 10)) {
      setIsDrawing(false);
      setStartPoint(null);
      setCurrentBox(null);
      return;
    }

    if (selectedShape === 'circle' && currentBox.radius! < 10) {
      setIsDrawing(false);
      setStartPoint(null);
      setCurrentBox(null);
      return;
    }

    const newAnnotation: Annotation = {
      ...currentBox,
      id: `annotation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    const updatedAnnotations = [...(elementContent.annotations || []), newAnnotation];
    const updatedContent = { ...elementContent, annotations: updatedAnnotations };
    
    setElementContent(updatedContent);
    
    // Update the element in the editor
    dispatch({
      type: 'UPDATE_ELEMENT',
      payload: {
        elementDetails: {
          ...props.element,
          content: updatedContent
        }
      }
    });

    setIsDrawing(false);
    setStartPoint(null);
    setCurrentBox(null);
  };

  // Delete annotation
  const deleteAnnotation = (annotationId: string) => {
    const updatedAnnotations = (elementContent.annotations || []).filter(ann => ann.id !== annotationId);
    const updatedContent = { ...elementContent, annotations: updatedAnnotations };
    
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

  // Render annotation shapes
  const renderAnnotations = () => {
    if (!imageRef.current || !imageLoaded) return null;

    const rect = imageRef.current.getBoundingClientRect();
    const scaleX = rect.width / imageRef.current.naturalWidth;
    const scaleY = rect.height / imageRef.current.naturalHeight;

    const allAnnotations = [...(elementContent.annotations || [])];
    if (currentBox) allAnnotations.push(currentBox);

    const elements = allAnnotations.map((annotation, index) => {
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
            className="absolute -top-6 left-0 px-2 py-1 text-xs font-bold text-white rounded pointer-events-none"
            style={{ 
              left: labelX,
              top: labelY,
              backgroundColor: annotation.color 
            }}
          >
            {annotation.label}
            {annotation.id !== currentBox?.id && state.editor.liveMode && !pageDetails.submitted && (
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

    // Add current polygon points preview
    if (isDrawingPolygon && polygonPoints.length > 0) {
      const pathData = polygonPoints
        .map((point, i) => `${i === 0 ? 'M' : 'L'} ${point.x * scaleX} ${point.y * scaleY}`)
        .join(' ');
      
      elements.push(
        <svg
          key="current-polygon"
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
            stroke="#0066cc"
            strokeWidth="2"
            strokeDasharray="5,5"
            fill="none"
          />
          {polygonPoints.map((point, i) => (
            <circle
              key={i}
              cx={point.x * scaleX}
              cy={point.y * scaleY}
              r="4"
              fill="#0066cc"
            />
          ))}
        </svg>
      );
    }

    return elements;
  };

  const isSelected = state.editor.selectedElement.id === props.element.id;
  const isLiveMode = state.editor.liveMode;

  // Check if src is valid URL
  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const renderImageContent = () => {
    console.log('🖼️ renderImageContent called:', {
      src: elementContent.src,
      isLiveMode,
      imageLoading,
      imageError,
      imageLoaded,
      isValidUrl: elementContent.src ? isValidUrl(elementContent.src) : false
    });

    if (!elementContent.src) {
      console.log('⚠️ No image URL provided');
      return (
        <div className="w-full h-64 bg-muted rounded-lg flex flex-col items-center justify-center">
          <div className="text-sm text-muted-foreground text-center">
            No image URL provided
          </div>
        </div>
      );
    }

    if (!isValidUrl(elementContent.src)) {
      console.log('❌ Invalid URL format:', elementContent.src);
      return (
        <div className="w-full h-64 bg-red-50 border border-red-200 rounded-lg flex flex-col items-center justify-center">
          <AlertCircle className="w-6 h-6 text-red-500 mb-2" />
          <div className="text-sm text-red-600 text-center">Invalid URL format</div>
          <div className="text-xs text-red-500 text-center mt-1 break-all">
            {elementContent.src}
          </div>
        </div>
      );
    }

    console.log('✅ Valid URL, rendering image component');
    return (
      <div className="relative w-full">
        {imageLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded z-10">
            <div className="text-sm text-gray-500">Loading...</div>
          </div>
        )}
        
        {imageError && (
          <div className="w-full h-64 bg-red-50 border border-red-200 rounded-lg flex flex-col items-center justify-center">
            <AlertCircle className="w-6 h-6 text-red-500 mb-2" />
            <div className="text-sm text-red-600 text-center mb-2">Failed to load image</div>
            <div className="text-xs text-red-500 text-center break-all max-w-[300px]">
              {elementContent.src}
            </div>
          </div>
        )}

        {!imageError && (
          <div className="relative">
            <img
              ref={imageRef}
              src={elementContent.src}
              alt="Annotation target"
              className="w-full h-auto object-contain rounded"
              onLoad={handleImageLoad}
              onError={handleImageError}
              onLoadStart={handleImageLoadStart}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              style={{
                display: imageLoading ? 'none' : 'block',
                cursor: (isLiveMode && selectedLabel && !pageDetails.submitted) ? 'crosshair' : 'default'
              }}
            />
            {renderAnnotations()}
          </div>
        )}
      </div>
    );
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
        {/* Instructions - Show to annotators in live mode */}
        {isLiveMode && elementContent.instructions && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">{elementContent.instructions}</p>
          </div>
        )}

        {/* Shape Selector - Only show to annotators in live mode, not during review */}
        {isLiveMode && !pageDetails.submitted && (
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
                  // Reset polygon state when changing shapes
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

        {/* Label Selector - Only show to annotators in live mode, not during review */}
        {isLiveMode && !pageDetails.submitted && (elementContent.labelCategories || []).length > 0 && (
          <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">Select label:</span>
            {(elementContent.labelCategories || []).map((category) => (
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
        {isLiveMode && !pageDetails.submitted && selectedShape === 'polygon' && (
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

        {/* Image and Annotation Area */}
        {renderImageContent()}

        {/* Annotation List - Show in live mode, but make read-only during review */}
        {isLiveMode && (elementContent.annotations || []).length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">
              Annotations ({(elementContent.annotations || []).length})
              {pageDetails.submitted && <span className="text-xs text-gray-500 ml-2">(Review Mode)</span>}
            </h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {(elementContent.annotations || []).map((annotation, index) => (
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
                      {annotation.shape === 'rectangle' && `📦 ${Math.round(annotation.width || 0)}×${Math.round(annotation.height || 0)}`}
                      {annotation.shape === 'circle' && `⭕ r=${Math.round(annotation.radius || 0)}`}
                      {annotation.shape === 'polygon' && `🔷 ${annotation.points?.length || 0} points`}
                      {annotation.shape === 'point' && `📍 (${Math.round(annotation.x)}, ${Math.round(annotation.y)})`}
                    </span>
                  </div>
                  {/* Only show delete button if not submitted (not in review mode) */}
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
            <div className="text-sm text-gray-600 mb-2">Image Annotation Element</div>
            <div className="text-xs text-gray-500">
              {(elementContent.labelCategories || []).length} label categories configured
              {elementContent.src && <span className="block mt-1">Image: {elementContent.src}</span>}
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
            <h3 className="font-medium">Image Annotation Settings</h3>
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

export default ImageAnnotation;
