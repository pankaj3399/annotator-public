'use client'

import { EditorElement, useEditor } from '@/providers/editor/editor-provider'
import { Checkbox as CheckboxPrimitive } from "@/components/ui/checkbox"
import { Label } from '@/components/ui/label'
import { Trash } from 'lucide-react'
import clsx from 'clsx'
import React from 'react'

type Props = {
  element: EditorElement
}

const Checkbox = (props: Props) => {
  const { dispatch, state, pageDetails } = useEditor()

  const [elementContent, setElementContent] = React.useState({
    selectedCheckboxes: !Array.isArray(props.element.content) ? props.element.content?.selectedCheckbox || [] : [],
    checkboxes: !Array.isArray(props.element.content) ? props.element.content?.checkboxes || [] : [],
    title: !Array.isArray(props.element.content) ? props.element.content?.title || '' : '',
    type: !Array.isArray(props.element.content) ? props.element.content?.type || 'single' : 'single'
  })

  React.useEffect(() => {
    setElementContent({
      selectedCheckboxes: !Array.isArray(props.element.content) ? props.element.content?.selectedCheckbox || [] : [],
      checkboxes: !Array.isArray(props.element.content) ? props.element.content?.checkboxes || [] : [],
      title: !Array.isArray(props.element.content) ? props.element.content?.title || '' : '',
      type: !Array.isArray(props.element.content) ? props.element.content?.type || 'single' : 'single'
    })
  }, [props.element])

  const handleDeleteElement = () => {
    dispatch({
      type: 'DELETE_ELEMENT',
      payload: { elementDetails: props.element },
    })
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

  const handleCheckboxChange = (value: string) => {
    const newSelectedCheckboxes = elementContent.type === 'single'
      ? [value]
      : elementContent.selectedCheckboxes.includes(value)
        ? elementContent.selectedCheckboxes.filter(item => item !== value)
        : [...elementContent.selectedCheckboxes, value]

    setElementContent(prev => ({
      ...prev,
      selectedCheckboxes: newSelectedCheckboxes
    }))

    dispatch({
      type: 'UPDATE_ELEMENT',
      payload: {
        elementDetails: {
          ...props.element,
          content: {
            ...props.element.content,
            selectedCheckbox: newSelectedCheckboxes,
          },
        },
      },
    })
  }

  const isSelected = state.editor.selectedElement.id === props.element.id
  const isLiveMode = state.editor.liveMode

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
        <div className="absolute -top-[25px] right-[0px]">
          <div className="bg-primary px-2.5 py-1 text-xs font-bold rounded-none rounded-t-lg !text-white">
            <Trash
              className="cursor-pointer"
              size={16}
              onClick={handleDeleteElement}
            />
          </div>
        </div>
      )}

      <div className="w-full p-4">
        {elementContent.title && (
          <h2 className="text-xl font-semibold mb-3">{elementContent.title}</h2>
        )}

        <div className="space-y-2">
          {elementContent.checkboxes.length > 0 ? (
            elementContent.checkboxes.map((checkbox, index) => (
              <div key={index} className="flex items-center space-x-2">
                <CheckboxPrimitive
                  id={`checkbox-${props.element.id}-${index}`}
                  checked={elementContent.selectedCheckboxes.includes(checkbox)}
                  onCheckedChange={() => handleCheckboxChange(checkbox)}
                  disabled={pageDetails.submitted}
                />
                <Label htmlFor={`checkbox-${props.element.id}-${index}`}>{checkbox}</Label>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground italic">No checkboxes added yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default Checkbox