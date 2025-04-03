'use client';

import { EditorElement, useEditor } from '@/providers/editor/editor-provider';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Trash } from 'lucide-react';
import { toast } from 'sonner';
import clsx from 'clsx';
import React, { useState, useEffect } from 'react';

type Props = {
  element: EditorElement;
};

const DynamicTextComponent = (props: Props) => {
  const { dispatch, state, pageDetails } = useEditor();

  const [elementContent, setElementContent] = useState({
    innerText: !Array.isArray(props.element.content)
      ? props.element.content?.innerText || '{{text}}'
      : '{{text}}',
    // Translation settings
    translationEnabled: !Array.isArray(props.element.content)
      ? props.element.content?.translationEnabled || false
      : false,
    translationModel: !Array.isArray(props.element.content)
      ? props.element.content?.translationModel || 'deepl'
      : 'deepl',
    translationApiKey: !Array.isArray(props.element.content)
      ? props.element.content?.translationApiKey || ''
      : '',
    sourceLanguage: !Array.isArray(props.element.content)
      ? props.element.content?.sourceLanguage || 'auto'
      : 'auto',
    targetLanguage: !Array.isArray(props.element.content)
      ? props.element.content?.targetLanguage || 'en'
      : 'en',
    translation: !Array.isArray(props.element.content)
      ? props.element.content?.translation || ''
      : '',
    // Target input field - can be null to indicate this field doesn't show translation
    translationTarget: !Array.isArray(props.element.content)
      ? props.element.content?.translationTarget || null
      : null,
  });

  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    setElementContent({
      innerText: !Array.isArray(props.element.content)
        ? props.element.content?.innerText || '{{text}}'
        : '{{text}}',
      translationEnabled: !Array.isArray(props.element.content)
        ? props.element.content?.translationEnabled || false
        : false,
      translationModel: !Array.isArray(props.element.content)
        ? props.element.content?.translationModel || 'deepl'
        : 'deepl',
      translationApiKey: !Array.isArray(props.element.content)
        ? props.element.content?.translationApiKey || ''
        : '',
      sourceLanguage: !Array.isArray(props.element.content)
        ? props.element.content?.sourceLanguage || 'auto'
        : 'auto',
      targetLanguage: !Array.isArray(props.element.content)
        ? props.element.content?.targetLanguage || 'en'
        : 'en',
      translation: !Array.isArray(props.element.content)
        ? props.element.content?.translation || ''
        : '',
      translationTarget: !Array.isArray(props.element.content)
        ? props.element.content?.translationTarget || null
        : null,
    });
  }, [props.element]);

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

  const handleTranslate = async () => {
    if (!elementContent.translationEnabled) {
      toast.error('Translation is not enabled for this element');
      return;
    }

    if (!elementContent.innerText || elementContent.innerText === '{{text}}') {
      toast.error('No valid text to translate');
      return;
    }

    setIsTranslating(true);

    try {
      // Call your translation API
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: elementContent.innerText,
          model: elementContent.translationModel,
          apiKey: elementContent.translationApiKey,
          sourceLanguage: elementContent.sourceLanguage,
          targetLanguage: elementContent.targetLanguage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Translation failed');
      }

      const data = await response.json();
      const newTranslation = data.translation;

      // Update state and element
      setElementContent((prev) => ({ ...prev, translation: newTranslation }));

      dispatch({
        type: 'UPDATE_ELEMENT',
        payload: {
          elementDetails: {
            ...props.element,
            content: {
              ...((!Array.isArray(props.element.content) &&
                props.element.content) ||
                {}),
              translation: newTranslation,
            },
          },
        },
      });

      toast.success('Translation completed successfully');
    } catch (error) {
      console.error('Translation error:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Error occurred during translation'
      );
    } finally {
      setIsTranslating(false);
    }
  };

  // Function to check if this component is the translation target
  const isTranslationTarget = () => {
    // Check if this component is selected as a translation target
    if (elementContent.translationTarget === props.element.id) {
      return true;
    }

    // If translationTarget is null, then it's not a target
    return false;
  };

  const shouldShowTranslationUI = () => {
    return elementContent.translationEnabled;
  };

  const isSelected = state.editor.selectedElement.id === props.element.id;
  const isLiveMode = state.editor.liveMode;

  return (
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

      {!isLiveMode ? (
        <div
          contentEditable={!isLiveMode}
          onBlur={(e) =>
            handleContentChange(e.currentTarget.textContent || '{{text}}')
          }
          className='outline-none w-full'
          suppressContentEditableWarning={true}
        >
          {elementContent.innerText}
        </div>
      ) : (
        <div className='w-full'>
          {/* Original content */}
          <div>
            {elementContent.innerText !== '{{text}}'
              ? elementContent.innerText
              : ''}
          </div>

          {/* Translation section - only show if this is the designated translation field */}
          {isTranslationTarget() && elementContent.translation && (
            <div className='mt-3 pt-3 border-t'>
              <div className='text-sm font-medium mb-2'>Translation:</div>
              <div>{elementContent.translation}</div>
            </div>
          )}

          {/* Translation UI controls - only show if translation is enabled and we're not in submitted mode */}
          {shouldShowTranslationUI() && !pageDetails.submitted && (
            <div className='w-full mt-3 pt-3 border-t'>
              <Button
                variant='outline'
                size='sm'
                onClick={handleTranslate}
                disabled={
                  isTranslating || elementContent.innerText === '{{text}}'
                }
                className='mt-2'
              >
                {isTranslating ? 'Translating...' : 'Translate'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DynamicTextComponent;
