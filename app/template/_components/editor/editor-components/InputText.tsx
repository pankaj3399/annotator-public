'use client';

import { EditorElement, useEditor } from '@/providers/editor/editor-provider';
import { Textarea } from '@/components/ui/textarea';
import { Trash } from 'lucide-react';
import clsx from 'clsx';
import React from 'react';

type Props = {
  element: EditorElement;
};

const InputText = (props: Props) => {
  const { dispatch, state, pageDetails } = useEditor();

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

  const handleDeleteElement = () => {
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
          <div className='bg-primary px-2.5 py-1 text-xs font-bold rounded-none rounded-t-lg !text-white'>
            <Trash
              className='cursor-pointer'
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
    </div>
  );
};

export default InputText;