'use client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox as CheckboxPrimitive } from "@/components/ui/checkbox"
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { EditorBtns } from '@/lib/constants'
import { EditorElement, useEditor } from '@/providers/editor/editor-provider'
import clsx from 'clsx'
import { Trash } from 'lucide-react'
import React, { useState } from 'react'

type Props = {
  element: EditorElement
}

const Checkbox = (props: Props) => {
  const { dispatch, state, subaccountId, funnelId, pageDetails } = useEditor()
  const [name, setName] = React.useState(props.element.name)

  const initial = React.useMemo(() => {
    if (Array.isArray(props.element.content)) {
      return []
    }
    return props.element.content?.selectedCheckbox || []
  }, [props.element.content])
  const checkbox = React.useMemo(() => {
    if (Array.isArray(props.element.content)) {
      return []
    }
    return props.element.content?.checkboxes || []
  }, [props.element.content])
  const ques = React.useMemo(() => {
    if (Array.isArray(props.element.content)) {
      return ""
    }
    return props.element.content?.title || ""
  }, [props.element.content])
  const [selectedCheckboxes, setSelectedCheckboxes] = useState<string[]>(initial)
  const [checkboxType, setCheckboxType] = useState('single')
  const [checkboxes, setCheckboxes] = useState<string[]>(checkbox)
  const [newCheckbox, setNewCheckbox] = useState('')
  const [title, setTitle] = useState(ques)


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

  const styles = props.element.styles

  const handleDeleteElement = () => {
    dispatch({
      type: 'DELETE_ELEMENT',
      payload: { elementDetails: props.element },
    })
  }


const handleAddCheckbox = (e: React.FormEvent) => {
  e.preventDefault()
  if (newCheckbox.trim() !== '') {
    setCheckboxes([...checkboxes, newCheckbox.trim()])
    setNewCheckbox('')
    dispatch({
      type: 'UPDATE_ELEMENT',
      payload: {
        elementDetails: {
          ...props.element,
          content: {
            checkboxes: [...checkboxes, newCheckbox.trim()],
            title:title
          },
        },
      },
    })
  }
}

const handleCheckboxChange = (value: string) => {
  if (checkboxType === 'single') {
    setSelectedCheckboxes([value])
  } else {
    setSelectedCheckboxes(prev =>
      prev.includes(value)
        ? prev.filter(item => item !== value)
        : [...prev, value]
    )
  }
}


return (
  <div
    style={styles}
    draggable
    onDragStart={(e) => handleDragStart(e, 'checkbox')}
    onClick={handleOnClickBody}
    className={clsx(
      'p-[2px] w-full m-[5px] relative text-[16px] transition-all flex items-center justify-center',
      {
        '!border-blue-500':
          state.editor.selectedElement.id === props.element.id,

        '!border-solid': state.editor.selectedElement.id === props.element.id,
        'border-dashed border-[1px] border-slate-300': !state.editor.liveMode,
      }
    )}
  >
    {state.editor.selectedElement.id === props.element.id &&
      !state.editor.liveMode && (
        <div className="absolute -top-[23px] -left-[1px]  flex ">
        {/* <Badge className=" rounded-none rounded-t-lg">
          {state.editor.selectedElement.name}
        </Badge> */}
        <Input className="w-full h-6 bg-black text-white font-semibold text-xs rounded-none rounded-t-lg" placeholder='title' value={name} onChange={(e) => setName(e.target.value)}
          onBlur={(e) => dispatch({
            type: 'UPDATE_ELEMENT',
            payload: {
              elementDetails: { ...props.element, name: e.target.value},
            },
          })} />
      </div>
      )}

    <div className="flex space-x-6 p-4 mx-auto">
      {!state.editor.liveMode && (
        <>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold mb-2">Select Checkbox Type</h2>
            <RadioGroup
              value={checkboxType}
              onValueChange={setCheckboxType}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="single" id="single" />
                <Label htmlFor="single">Single</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="multiple" id="multiple" />
                <Label htmlFor="multiple">Multiple</Label>
              </div>
            </RadioGroup>

            <div className="space-y-2">
              <Label htmlFor="title-input">Enter Title</Label>
              <Input
                id="title-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter title for checkboxes"
              />
            </div>

            <form onSubmit={handleAddCheckbox} className="space-y-2">
              <Label htmlFor="checkbox-input">Add New Checkbox</Label>
              <div className="flex space-x-2">
                <Input
                  id="checkbox-input"
                  type="text"
                  value={newCheckbox}
                  onChange={(e) => setNewCheckbox(e.target.value)}
                  placeholder="Enter checkbox label"
                />
                <Button type="submit">Add</Button>
                <Button type="button" onClick={() => setCheckboxes([])}>Reset</Button>
              </div>
            </form>
          </div>
        </>)}

      <div className="  pt-4">
        {title && <h2 className="text-xl font-semibold mb-3">{title}</h2>}

        {checkboxes.length > 0 ? (
          checkboxes.map((checkbox, index) => (
            <div key={index} className="flex mb-2 items-center space-x-2">
              <CheckboxPrimitive
                id={`checkbox-${index}`}
                checked={selectedCheckboxes.includes(checkbox)}
                onCheckedChange={() => handleCheckboxChange(checkbox)}
                onBlur={(e) => {
                  dispatch({
                    type: 'UPDATE_ELEMENT',
                    payload: {
                      elementDetails: {
                        ...props.element,
                        content: {
                          ...props.element.content,
                          selectedCheckbox: selectedCheckboxes,
                        },
                      },
                    },
                  })}}
              />
              <Label htmlFor={`checkbox-${index}`}>{checkbox}</Label>
            </div>
          ))
        ) : (
          <p className="text-gray-500 italic">No checkboxes added yet.</p>
        )}
        {/* <Button onClick={handleSubmit} className='mt-4' disabled={pageDetails.submitted}>{pageDetails.submitted ? "Submitted" : "Submit"}</Button> */}
      </div>


      {state.editor.selectedElement.id === props.element.id &&
        !state.editor.liveMode && (
          <div className="absolute bg-primary px-2.5 py-1 text-xs font-bold  -top-[25px] -right-[1px] rounded-none rounded-t-lg !text-white">
            <Trash
              className="cursor-pointer"
              size={16}
              onClick={handleDeleteElement}
            />
          </div>
        )}
    </div>
  </div>
)
}

export default Checkbox
