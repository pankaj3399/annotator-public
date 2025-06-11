'use client'

import { EditorBtns } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { EditorElement, useEditor } from '@/providers/editor/editor-provider'
import clsx from 'clsx'
import { Trash, Settings, X, AlertCircle, ExternalLink } from 'lucide-react'
import React, { useState, useRef, useEffect } from 'react'
import PropertyPanel from '@/app/template/_components/editor/editor-components/propertypanel'

type Props = {
  element: EditorElement
}

const DynamicImageComponent = (props: Props) => {
  const { dispatch, state } = useEditor()
  // Local state to track if settings panel is visible for this specific element
  const [showSettings, setShowSettings] = useState(false)
  // Refs to detect clicks outside
  const componentRef = useRef<HTMLDivElement>(null)
  
  // Add image loading states
  const [imageLoading, setImageLoading] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  
  const [elementContent, setElementContent] = React.useState({
    src: !Array.isArray(props.element.content) ? props.element.content?.src || '' : ''
  })

  React.useEffect(() => {
    const newSrc = !Array.isArray(props.element.content) ? props.element.content?.src || '' : ''
    setElementContent({
      src: newSrc
    })
    
    // Reset image states when src changes
    if (newSrc !== elementContent.src) {
      setImageLoading(false)
      setImageError(null)
      setImageLoaded(false)
    }
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

  // Image loading handlers
  const handleImageLoad = () => {
    setImageLoading(false)
    setImageError(null)
    setImageLoaded(true)
    console.log('Image loaded successfully:', elementContent.src)
  }

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setImageLoading(false)
    setImageLoaded(false)
    const errorMsg = `Failed to load image: ${elementContent.src}`
    setImageError(errorMsg)
    console.error('Image loading error:', errorMsg, e)
  }

  const handleImageLoadStart = () => {
    setImageLoading(true)
    setImageError(null)
    console.log('Started loading image:', elementContent.src)
  }

  // Function to open image in new tab for debugging
  const openImageInNewTab = () => {
    if (elementContent.src) {
      window.open(elementContent.src, '_blank')
    }
  }

  const isSelected = state.editor.selectedElement.id === props.element.id
  const isLiveMode = state.editor.liveMode

  const defaultWidth = props.element.styles?.width || '560px'
  const defaultHeight = props.element.styles?.height || '315px'

  // Check if src is valid URL
  const isValidUrl = (string: string) => {
    try {
      new URL(string)
      return true
    } catch (_) {
      return false
    }
  }

  const renderImageContent = () => {
    if (!elementContent.src) {
      return (
        <div className={cn('w-fit h-fit bg-muted rounded-lg p-4 min-w-[200px] min-h-[100px] flex flex-col items-center justify-center')}>
          <div className="text-sm text-muted-foreground text-center">
            No image URL provided
          </div>
        </div>
      )
    }

    if (!isValidUrl(elementContent.src)) {
      return (
        <div className={cn('w-fit h-fit bg-red-50 border border-red-200 rounded-lg p-4 min-w-[200px] min-h-[100px] flex flex-col items-center justify-center')}>
          <AlertCircle className="w-6 h-6 text-red-500 mb-2" />
          <div className="text-sm text-red-600 text-center">
            Invalid URL format
          </div>
          <div className="text-xs text-red-500 text-center mt-1 break-all">
            {elementContent.src}
          </div>
        </div>
      )
    }

    return (
      <div className="relative">
        {imageLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded">
            <div className="text-sm text-gray-500">Loading...</div>
          </div>
        )}
        
        {imageError && (
          <div className={cn('w-fit h-fit bg-red-50 border border-red-200 rounded-lg p-4 min-w-[200px] min-h-[100px] flex flex-col items-center justify-center')}>
            <AlertCircle className="w-6 h-6 text-red-500 mb-2" />
            <div className="text-sm text-red-600 text-center mb-2">
              Failed to load image
            </div>
            <div className="text-xs text-red-500 text-center mb-3 break-all max-w-[300px]">
              {elementContent.src}
            </div>
            <button 
              onClick={openImageInNewTab}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 underline"
            >
              <ExternalLink className="w-3 h-3" />
              Open in new tab
            </button>
          </div>
        )}

        {!imageError && (
          <img
            src={elementContent.src}
            width={defaultWidth}
            height={defaultHeight}
            alt="Dynamic content"
            className="object-contain"
            onLoad={handleImageLoad}
            onError={handleImageError}
            onLoadStart={handleImageLoadStart}
            style={{ 
              display: imageLoading ? 'none' : 'block',
              maxWidth: '100%',
              height: 'auto'
            }}
          />
        )}
      </div>
    )
  }

  return (
    <div
      ref={componentRef}
      style={props.element.styles}
      draggable
      onDragStart={(e) => handleDragStart(e, 'dynamicImage')}
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
            {elementContent.src && (
              <ExternalLink
                className="cursor-pointer hover:text-blue-200"
                size={16}
                onClick={openImageInNewTab}
                title="Open image in new tab"
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

      {isLiveMode ? (
        renderImageContent()
      ) : (
        <div className={cn('w-fit h-fit bg-muted rounded-lg p-2')}>
          <div className="mb-2 text-sm text-muted-foreground">
            Image will be here
            {elementContent.src && (
              <span className="block text-xs text-blue-600 mt-1 break-all">
                URL: {elementContent.src}
              </span>
            )}
          </div>
          {renderImageContent()}
        </div>
      )}

      {/* Inline Property Panel */}
      {isSelected && showSettings && !isLiveMode && (
        <div 
          className="absolute left-0 right-0 mt-2 z-50 bg-white border rounded-md shadow-lg"
          onClick={handlePropertyPanelClick}
        >
          <div className="flex items-center justify-between p-3 border-b">
            <h3 className="font-medium">Image Settings</h3>
            <button 
              onClick={handleToggleSettings}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <X size={16} />
            </button>
          </div>
          <div className="p-4">
            <PropertyPanel />
            
            {/* Debug information */}
            {elementContent.src && (
              <div className="mt-4 p-3 bg-gray-50 rounded text-xs">
                <div className="font-medium mb-2">Debug Info:</div>
                <div>URL: <span className="break-all">{elementContent.src}</span></div>
                <div>Valid URL: {isValidUrl(elementContent.src) ? 'Yes' : 'No'}</div>
                <div>Loading: {imageLoading ? 'Yes' : 'No'}</div>
                <div>Loaded: {imageLoaded ? 'Yes' : 'No'}</div>
                {imageError && <div className="text-red-600">Error: {imageError}</div>}
                <button 
                  onClick={openImageInNewTab}
                  className="mt-2 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                >
                  Test URL in new tab
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default DynamicImageComponent