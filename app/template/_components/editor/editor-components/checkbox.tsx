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
  const { dispatch, state, pageDetails } = useEditor() // Added pageDetails
  // Local state to track if settings panel is visible for this specific element
  const [showSettings, setShowSettings] = useState(false)
  // Refs to detect clicks outside
  const componentRef = useRef<HTMLDivElement>(null)

  const [elementContent, setElementContent] = React.useState({
    title: !Array.isArray(props.element.content) ? props.element.content?.title || 'Checkbox Group' : 'Checkbox Group',
    checkboxes: !Array.isArray(props.element.content) ? props.element.content?.checkboxes || ['Option 1'] : ['Option 1'],
    selectedCheckbox: !Array.isArray(props.element.content) ? props.element.content?.selectedCheckbox || [] : []
  })

  React.useEffect(() => {
    setElementContent({
      title: !Array.isArray(props.element.content) ? props.element.content?.title || 'Checkbox Group' : 'Checkbox Group',
      checkboxes: !Array.isArray(props.element.content) ? props.element.content?.checkboxes || ['Option 1'] : ['Option 1'],
      selectedCheckbox: !Array.isArray(props.element.content) ? props.element.content?.selectedCheckbox || [] : []
    })
  }, [props.element])

  // Handle clicks outside the component to maintain selection
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!showSettings) return;
      if (componentRef.current && !componentRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettings]);

  const handleDeleteElement = (e: React.MouseEvent) => {
    e.stopPropagation()
    dispatch({
      type: 'DELETE_ELEMENT',
      payload: { elementDetails: props.element },
    })
  }

  const handleToggleSettings = (e: React.MouseEvent) => {
    e.stopPropagation()
    dispatch({
      type: 'CHANGE_CLICKED_ELEMENT',
      payload: {
        elementDetails: props.element,
      },
    })
    setShowSettings(prev => !prev)
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

  const handleCheckboxChange = (option: string, isChecked: boolean) => {
    // Prevent changes if page is submitted
    if (pageDetails.submitted) return;

    let newSelectedCheckbox: string[]
    
    if (isChecked) {
      newSelectedCheckbox = elementContent.selectedCheckbox.includes(option) 
        ? elementContent.selectedCheckbox 
        : [...elementContent.selectedCheckbox, option]
    } else {
      newSelectedCheckbox = elementContent.selectedCheckbox.filter(item => item !== option)
    }
    
    setElementContent(prev => ({
      ...prev,
      selectedCheckbox: newSelectedCheckbox
    }))
    
    if (!Array.isArray(props.element.content)) {
      dispatch({
        type: 'UPDATE_ELEMENT',
        payload: {
          elementDetails: {
            ...props.element,
            content: {
              ...props.element.content,
              selectedCheckbox: newSelectedCheckbox
            }
          }
        }
      })
    }
  }

  const isSelected = state.editor.selectedElement.id === props.element.id
  const isLiveMode = state.editor.liveMode

  const handlePropertyPanelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
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

        <div className="p-3">
          {/* Title */}
          {elementContent.title && (
            <div className="mb-3">
              <h3 className="text-sm font-medium text-gray-900">
                {elementContent.title}
              </h3>
            </div>
          )}
          
          {/* Checkbox Options */}
          <div className="space-y-2">
            {elementContent.checkboxes.map((option, index) => (
              <div key={`${option}-${index}`} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`checkbox-${props.element.id}-${index}`}
                  checked={elementContent.selectedCheckbox.includes(option)}
                  onChange={(e) => handleCheckboxChange(option, e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  disabled={!isLiveMode || pageDetails.submitted} // Added pageDetails.submitted check
                />
                <label 
                  htmlFor={`checkbox-${props.element.id}-${index}`}
                  className="text-sm font-medium text-gray-700 cursor-pointer"
                >
                  {option}
                </label>
              </div>
            ))}
          </div>
          
          {elementContent.checkboxes.length === 0 && (
            <div className="text-sm text-gray-500 italic">
              No checkbox options configured. Add options in settings.
            </div>
          )}
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
            <PropertyPanel />
          </div>
        </div>
      )}
    </div>
  )
}

export default CheckboxComponent