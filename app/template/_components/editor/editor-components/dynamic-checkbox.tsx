'use client'
import { updateTask } from '@/app/actions/task'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox as CheckboxPrimitive } from "@/components/ui/checkbox"
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import useTimer from '@/hooks/use-timer'
import { toast } from '@/hooks/use-toast'
import { EditorBtns } from '@/lib/constants'
import { EditorElement, useEditor } from '@/providers/editor/editor-provider'
import clsx from 'clsx'
import { Trash, Settings, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import React, { useState, useRef, useEffect } from 'react'
import PropertyPanel from '@/app/template/_components/editor/editor-components/propertypanel'

type Props = {
  element: EditorElement
}

const DynamicCheckbox = (props: Props) => {
  const { dispatch, state, subaccountId, funnelId, pageDetails } = useEditor()
  const [name, setName] = React.useState(props.element.name)
  // Local state to track if settings panel is visible for this specific element
  const [showSettings, setShowSettings] = useState(false)
  // Refs to detect clicks outside
  const componentRef = useRef<HTMLDivElement>(null)

  const router = useRouter()
  const { time } = useTimer()
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
  const type = React.useMemo(() => {
    if (Array.isArray(props.element.content)) {
      return "single"
    }
    return props.element.content?.type || "single"
  }, [props.element.content])
  const [selectedCheckboxes, setSelectedCheckboxes] = useState<string[]>(initial)
  const [checkboxType, setCheckboxType] = useState(type)
  const [checkboxes, setCheckboxes] = useState<string[]>(checkbox)
  const [newCheckbox, setNewCheckbox] = useState('')
  const [title, setTitle] = useState(ques)

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

  const styles = props.element.styles

  const handleDeleteElement = (e: React.MouseEvent) => {
    e.stopPropagation()
    dispatch({
      type: 'DELETE_ELEMENT',
      payload: { elementDetails: props.element },
    })
  }

  const handleSubmit = async () => {
    if (selectedCheckboxes.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Failed',
        description: 'Please select at least one checkbox',
      })
      return
    }
    const content = JSON.stringify(state.editor.elements)
    if (!state.editor.liveMode) return

    try {
      await updateTask({
        ...pageDetails,
        content,
      }, funnelId, subaccountId, time)
      toast({
        title: 'Success',
        description: 'Successfully submitted',
      })
      router.back()
    } catch (error) {
      console.log(error)
      toast({
        variant: 'destructive',
        title: 'Failed',
        description: 'submission failed',
      })
    }
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
              title: title,
              type: checkboxType
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

  const isSelected = state.editor.selectedElement.id === props.element.id
  const isLiveMode = state.editor.liveMode

  return (
    <div
      ref={componentRef}
      style={styles}
      draggable
      onDragStart={(e) => handleDragStart(e, 'dynamicCheckbox')}
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
        {!isLiveMode && (
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
                  onBlur={() => {
                    dispatch({
                      type: 'UPDATE_ELEMENT',
                      payload: {
                        elementDetails: {
                          ...props.element,
                          content: {
                            ...props.element.content,
                            title: title,
                            type: checkboxType
                          },
                        },
                      },
                    })
                  }}
                  placeholder="Enter title for checkboxes"
                />
              </div>

              {/* <form onSubmit={handleAddCheckbox} className="space-y-2">
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
              </div>
            </form> */}
            </div>
          </>)}

        <div className="pt-4">
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
                    })
                  }}
                />
                <Label htmlFor={`checkbox-${index}`}>{checkbox}</Label>
              </div>
            ))
          ) : (
            <p className="text-gray-500 italic">No checkboxes added yet.</p>
          )}
          <Button onClick={handleSubmit} className='mt-4' disabled={pageDetails.submitted}>{pageDetails.submitted ? "Submitted" : "Submit"}</Button>
        </div>

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
      </div>

      {/* Inline Property Panel */}
      {isSelected && showSettings && !isLiveMode && (
        <div 
          className="absolute left-0 right-0 mt-2 z-50 bg-white border rounded-md shadow-lg"
          onClick={handlePropertyPanelClick}
        >
          <div className="flex items-center justify-between p-3 border-b">
            <h3 className="font-medium">Checkbox Group Settings</h3>
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

export default DynamicCheckbox