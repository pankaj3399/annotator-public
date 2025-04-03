'use client';

import { EditorElement, useEditor } from '@/providers/editor/editor-provider';
import clsx from 'clsx';
import { Trash } from 'lucide-react';
import React from 'react';

type Props = {
  element: EditorElement;
};

const TextComponent = (props: Props) => {
  const { dispatch, state } = useEditor();
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
    </div>
  );
};

export default TextComponent;
