'use client';

import { EditorElement, useEditor } from '@/providers/editor/editor-provider';
import { Textarea } from '@/components/ui/textarea';
import { Trash, Settings, X } from 'lucide-react';
import clsx from 'clsx';
import React, { useState, useRef, useEffect } from 'react';
import PropertyPanel from '@/app/template/_components/editor/editor-components/propertypanel';

type Props = {
  element: EditorElement;
};

const InputText = (props: Props) => {
  const { dispatch, state, pageDetails } = useEditor();
  // Local state to track if settings panel is visible for this specific element
  const [showSettings, setShowSettings] = useState(false);
  // Refs to detect clicks outside
  const componentRef = useRef<HTMLDivElement>(null);

  const [elementContent, setElementContent] = React.useState({
    innerText: !Array.isArray(props.element.content)
      ? props.element.content?.innerText || ''
      : '',
    charLimit: !Array.isArray(props.element.content)
      ? props.element.content?.limit || 10000
      : 10000,
    wordLimit: !Array.isArray(props.element.content)
      ? props.element.content?.wordLimit || 1000
      : 1000,
    copyAllowed: !Array.isArray(props.element.content)
      ? props.element.content.copyAllowed || false
      : false,
  });

  const [showNotification, setShowNotification] = React.useState(false);

  React.useEffect(() => {
    setElementContent({
      innerText: !Array.isArray(props.element.content)
        ? props.element.content?.innerText || ''
        : '',
      charLimit: !Array.isArray(props.element.content)
        ? props.element.content?.limit || 10000
        : 10000,
      wordLimit: !Array.isArray(props.element.content)
        ? props.element.content?.wordLimit || 1000
        : 1000,
      copyAllowed: !Array.isArray(props.element.content)
        ? props.element.content.copyAllowed || false
        : false,
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

  // Find any translations targeted at this input component
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

  const countWords = (text: string) => text.trim().split(/\s+/).length;

  const handleContentChange = (value: string) => {
    const wordCount = countWords(value);

    // Only update if within limits
    if (
      value.length <= elementContent.charLimit &&
      wordCount <= elementContent.wordLimit
    ) {
      setElementContent((prev) => ({ ...prev, innerText: value }));

      // If this is a translation target and we're in live mode,
      // find the source element and update its translation property
      if (isLiveMode && targetedTranslations.length > 0) {
        // Find the source element in the elements tree
        const findElement = (elements: EditorElement[], id: string): EditorElement | null => {
          for (const element of elements) {
            if (element.id === id) return element;
            if (element.content && Array.isArray(element.content)) {
              const found = findElement(element.content, id);
              if (found) return found;
            }
          }
          return null;
        };

        const sourceElement = findElement(
          state.editor.elements, 
          targetedTranslations[0].sourceId
        );
        
        if (sourceElement) {
          // Update the translation in the source element
          dispatch({
            type: 'UPDATE_ELEMENT',
            payload: {
              elementDetails: {
                ...sourceElement,
                content: {
                  ...((sourceElement.content && !Array.isArray(sourceElement.content)) 
                    ? sourceElement.content 
                    : {}),
                  translation: value,
                },
              },
            },
          });
        }
      }

      // Always update the innerText of this element too
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
    }
  };

  const isSelected = state.editor.selectedElement.id === props.element.id;
  const isLiveMode = state.editor.liveMode;
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (elementContent.copyAllowed === true) {
      return;
    } else {
      e.preventDefault();
      setShowNotification(true);
      setTimeout(() => {
        setShowNotification(false);
      }, 2000);
    }
  };

  // Determine if we should show translation
  const hasTranslation = isLiveMode && targetedTranslations.length > 0;
  const displayValue = hasTranslation 
    ? targetedTranslations[0].translation 
    : elementContent.innerText;

  return (
    <div
      ref={componentRef}
      style={props.element.styles}
      className={clsx(
        'p-[2px] w-full m-[5px] relative text-[16px] transition-all flex items-center justify-center',
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

      <form className='flex w-full items-center space-x-2 relative'>
        <Textarea
          onPaste={handlePaste}
          placeholder='Write here'
          required
          value={displayValue}
          maxLength={elementContent.charLimit}
          disabled={pageDetails.submitted}
          onChange={(e) => handleContentChange(e.target.value)}
          className='w-full'
        />
        
        {showNotification && (
          <div className='absolute top-[-30px] right-10 bg-red-500 text-white text-xs px-2 py-1 rounded-md shadow-lg animate-fade-in-out'>
            Pasting is not allowed
          </div>
        )}
      </form>

      {/* Inline Property Panel */}
      {isSelected && showSettings && !isLiveMode && (
        <div 
          className="absolute left-0 right-0 mt-2 z-50 bg-white border rounded-md shadow-lg"
          onClick={handlePropertyPanelClick}
        >
          <div className="flex items-center justify-between p-3 border-b">
            <h3 className="font-medium">Text Input Settings</h3>
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

export default InputText;