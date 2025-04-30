'use client';

import { EditorElement, useEditor } from '@/providers/editor/editor-provider';
import clsx from 'clsx';
import { Settings, Trash, X } from 'lucide-react';
import React, { useRef, useEffect, useState } from 'react';
import PropertyPanel from '@/app/template/_components/editor/editor-components/propertypanel';

type Props = {
  element: EditorElement;
};

const TextComponent = (props: Props) => {
  const { dispatch, state } = useEditor();
  // Local state to track if settings panel is visible for this specific element
  const [showSettings, setShowSettings] = useState(false);
  // Refs to detect clicks outside
  const componentRef = useRef<HTMLDivElement>(null);
  
  const [elementContent, setElementContent] = React.useState({
    innerText: !Array.isArray(props.element.content)
      ? props.element.content.innerText || ''
      : '',
  });

  // Function to find all elements with a specific type, including nested ones
  const findAllElementsOfType = (
    elements: EditorElement[],
    types: string[]
  ): EditorElement[] => {
    let result: EditorElement[] = [];

    elements.forEach((element) => {
      if (element.type && types.includes(element.type)) {
        result.push(element);
      }

      if (element.content && Array.isArray(element.content)) {
        result = [...result, ...findAllElementsOfType(element.content, types)];
      }
    });

    return result;
  };

  // Find any translations targeted at this text component
  const targetedTranslations = React.useMemo(() => {
    // Get all dynamic text elements
    const dynamicTexts = findAllElementsOfType(state.editor.elements, [
      'dynamicText',
    ]);

    // Filter for those targeting this element with translations
    return dynamicTexts
      .filter(
        (element) =>
          !Array.isArray(element.content) &&
          (element.content as any).translationEnabled &&
          (element.content as any).translationTarget === props.element.id &&
          (element.content as any).translation
      )
      .map((element) => ({
        sourceId: element.id,
        sourceName: element.name || `Element ${element.id.substring(0, 6)}`,
        translation: (element.content as any).translation,
      }));
  }, [state.editor.elements, props.element.id]);

  React.useEffect(() => {
    setElementContent({
      innerText: !Array.isArray(props.element.content)
        ? props.element.content.innerText || ''
        : '',
    });
  }, [props.element]);

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
    e.stopPropagation();
    dispatch({
      type: 'DELETE_ELEMENT',
      payload: { elementDetails: props.element },
    });
  };

  const handleOnClickBody = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({
      type: 'CHANGE_CLICKED_ELEMENT',
      payload: {
        elementDetails: props.element,
      },
    });
  };

  const handleToggleSettings = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the click from bubbling
    
    // First select the element
    dispatch({
      type: 'CHANGE_CLICKED_ELEMENT',
      payload: {
        elementDetails: props.element,
      },
    });
    
    // Toggle settings visibility
    setShowSettings(prev => !prev);
  };

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

  const handleContentChange = (value: string) => {
    setElementContent((prev) => ({ ...prev, innerText: value }));
    dispatch({
      type: 'UPDATE_ELEMENT',
      payload: {
        elementDetails: {
          ...props.element,
          content: {
            ...((!Array.isArray(props.element.content) &&
              props.element.content) ||
              {}),
            innerText: value,
          },
        },
      },
    });
  };

  const isSelected = state.editor.selectedElement.id === props.element.id;
  const isLiveMode = state.editor.liveMode;

  return (
    <div
      ref={componentRef}
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
        <div className='absolute -top-[25px] right-[0px]'>
          <div className='bg-primary px-2.5 py-1 text-xs font-bold rounded-t-lg !text-white flex items-center gap-2'>
            <Settings
              className={clsx("cursor-pointer hover:text-blue-200", {
                "text-blue-200": showSettings
              })}
              size={16}
              onClick={handleToggleSettings}
            />
            <Trash
              className='cursor-pointer hover:text-red-200'
              size={16}
              onClick={handleDeleteElement}
            />
          </div>
        </div>
      )}

      <div
        contentEditable={!isLiveMode}
        onBlur={(e) => {
          const target = e.target as HTMLDivElement;
          handleContentChange(target.innerText);
        }}
        className='outline-none w-full'
        suppressContentEditableWarning={true}
      >
        {isLiveMode && targetedTranslations.length > 0
          ? targetedTranslations[0].translation
          : elementContent.innerText}
      </div>

      {/* Inline Property Panel */}
      {isSelected && showSettings && !isLiveMode && (
        <div 
          className="absolute left-0 right-0 mt-2 z-50 bg-white border rounded-md shadow-lg"
          onClick={handlePropertyPanelClick}
        >
          <div className="flex items-center justify-between p-3 border-b">
            <h3 className="font-medium">Text Settings</h3>
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

export default TextComponent;