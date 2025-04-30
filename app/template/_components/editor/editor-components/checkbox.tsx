'use client'

import { EditorElement, useEditor } from '@/providers/editor/editor-provider'
import clsx from 'clsx'
import { Trash, Settings, X } from 'lucide-react'
import React, { useState, useRef, useEffect } from 'react'
import PropertyPanel from '@/app/template/_components/editor/editor-components/propertypanel'

type Props = {
  element: EditorElement
}

const CheckboxComponent = (props: Props) => {
  const { dispatch, state } = useEditor()
  // Local state to track if settings panel is visible for this specific element
  const [showSettings, setShowSettings] = useState(false)
  // Refs to detect clicks outside
  const componentRef = useRef<HTMLDivElement>(null)

  const [elementContent, setElementContent] = React.useState({
    innerText: !Array.isArray(props.element.content) ? props.element.content?.innerText || 'Checkbox' : 'Checkbox',
    selectedCheckbox: !Array.isArray(props.element.content) ? props.element.content?.selectedCheckbox || [] : []
  })

  React.useEffect(() => {
    setElementContent({
      innerText: !Array.isArray(props.element.content) ? props.element.content?.innerText || 'Checkbox' : 'Checkbox',
      selectedCheckbox: !Array.isArray(props.element.content) ? props.element.content?.selectedCheckbox || [] : []
    })
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

  const handleDeleteElement = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent the click from bubbling
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

  const handleOnClickBody = (e: React.MouseEvent) => {
    e.stopPropagation()
    // Always select this element when clicked
    dispatch({
      type: 'CHANGE_CLICKED_ELEMENT',
      payload: {
        elementDetails: props.element,
      },
    })
  }

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    const isChecked = e.target.checked
    
    // Update local state
    setElementContent(prev => ({
      ...prev,
      selectedCheckbox: isChecked ? [elementContent.innerText] : []
    }))
    
    // Update element in the editor state
    if (!Array.isArray(props.element.content)) {
      dispatch({
        type: 'UPDATE_ELEMENT',
        payload: {
          elementDetails: {
            ...props.element,
            content: {
              ...props.element.content,
              selectedCheckbox: isChecked ? [elementContent.innerText] : []
            }
          }
        }
      })
    }
  }

  const isSelected = state.editor.selectedElement.id === props.element.id
  const isLiveMode = state.editor.liveMode

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

  return (
    <div className="relative mb-4" ref={componentRef}>
      <div
        style={props.element.styles}
        className={clsx(
          'p-[2px] w-full m-[5px] relative text-[16px] transition-all',
          {
            '!border-blue-500': isSelected,
            '!border-solid': isSelected,
            'border-dashed border-[1px] border-slate-300': !isLiveMode,
          }
        )}
        onClick={handleOnClickBody}
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

        <div className="flex items-center gap-2 p-2">
          <input
            type="checkbox"
            checked={elementContent.selectedCheckbox.includes(elementContent.innerText)}
            onChange={handleCheckboxChange}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            disabled={isLiveMode ? false : true}
          />
          <label className="ml-2 text-sm font-medium text-gray-700">
            {elementContent.innerText}
          </label>
        </div>
      </div>

      {/* Inline Property Panel */}
      {isSelected && showSettings && !isLiveMode && (
        <div 
          className="absolute left-0 right-0 mt-2 z-50 bg-white border rounded-md shadow-lg"
          onClick={handlePropertyPanelClick}
        >
          <div className="flex items-center justify-between p-3 border-b">
            <h3 className="font-medium">Checkbox Settings</h3>
            <button 
              onClick={handleToggleSettings}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <X size={16} />
            </button>
          </div>
          <div className="p-4">
            {/* Using PropertyPanel without passing the element prop */}
            <PropertyPanel />
          </div>
        </div>
      )}
    </div>
  )
}

export default CheckboxComponent