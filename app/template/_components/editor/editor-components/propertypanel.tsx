'use client'

import { useEditor } from '@/providers/editor/editor-provider'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useState, useEffect } from 'react'
import { EditorBtns } from '@/lib/constants'

type ElementContent = {
  href?: string
  innerText?: string
  src?: string
  selectedCheckbox?: string[]
  title?: string
  checkboxes?: string[]
  type?: string
  limit?: number
  wordLimit?: number
}

const PropertyPanel = () => {
  const { state, dispatch } = useEditor()
  const element = state.editor.selectedElement

  const [elementProperties, setElementProperties] = useState({
    id: element.id || '',
    name: element.name || '',
    content: !Array.isArray(element.content) ? element.content : {},
  })

  useEffect(() => {
    setElementProperties({
      id: element.id || '',
      name: element.name || '',
      content: !Array.isArray(element.content) ? element.content : {},
    })
  }, [element])

  const handlePropertyChange = (property: string, value: any) => {
    setElementProperties(prev => ({ ...prev, [property]: value }))

    if (property === 'name') {
      dispatch({
        type: 'UPDATE_ELEMENT',
        payload: {
          elementDetails: {
            ...element,
            [property]: value,
          },
        },
      })
      return
    }

    dispatch({
      type: 'UPDATE_ELEMENT',
      payload: {
        elementDetails: {
          ...element,
          content: Array.isArray(element.content) 
            ? element.content 
            : {
                ...element.content,
                [property]: value,
              }
        },
      },
    })
  }

  if (!element || !element.id || element.type === '__body') {
    return null
  }

  const showProperties = () => {
    switch (element.type) {
      case 'inputText':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={elementProperties.name}
                onChange={(e) => handlePropertyChange('name', e.target.value)}
                placeholder="Element name"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Placeholder</Label>
              <Input
                value={!Array.isArray(elementProperties.content) ? elementProperties.content.innerText : ''}
                onChange={(e) => handlePropertyChange('innerText', e.target.value)}
                placeholder="Enter placeholder text"
              />
            </div>

            <div className="space-y-2">
              <Label>Word Limit</Label>
              <Input
                type="number"
                value={!Array.isArray(elementProperties.content) ? elementProperties.content.wordLimit : ''}
                onChange={(e) => handlePropertyChange('wordLimit', parseInt(e.target.value))}
                placeholder="Enter word limit"
              />
            </div>
          </div>
        )
        
      case 'text':
      case 'dynamicText':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={elementProperties.name}
                onChange={(e) => handlePropertyChange('name', e.target.value)}
                placeholder="Element name"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Text Content</Label>
              <Input
                value={!Array.isArray(elementProperties.content) ? elementProperties.content.innerText : ''}
                onChange={(e) => handlePropertyChange('innerText', e.target.value)}
                placeholder="Enter text content"
              />
            </div>
          </div>
        )

      case 'checkbox':
      case 'dynamicCheckbox':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={elementProperties.name}
                onChange={(e) => handlePropertyChange('name', e.target.value)}
                placeholder="Element name"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={!Array.isArray(elementProperties.content) ? elementProperties.content.title : ''}
                onChange={(e) => handlePropertyChange('title', e.target.value)}
                placeholder="Enter checkbox title"
              />
            </div>

            <div className="space-y-2">
              <Label>Options (comma-separated)</Label>
              <Input
                value={!Array.isArray(elementProperties.content) ? 
                  (elementProperties.content.checkboxes || []).join(', ') : ''}
                onChange={(e) => handlePropertyChange('checkboxes', e.target.value.split(',').map(s => s.trim()))}
                placeholder="Option 1, Option 2, Option 3"
              />
            </div>
          </div>
        )

      case 'video':
      case 'dynamicVideo':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={elementProperties.name}
                onChange={(e) => handlePropertyChange('name', e.target.value)}
                placeholder="Element name"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Video URL</Label>
              <Input
                value={!Array.isArray(elementProperties.content) ? elementProperties.content.src : ''}
                onChange={(e) => handlePropertyChange('src', e.target.value)}
                placeholder="Enter video URL"
              />
            </div>

            <div className="space-y-2">
              <Label>Time Limit (seconds)</Label>
              <Input
                type="number"
                value={!Array.isArray(elementProperties.content) ? elementProperties.content.limit : ''}
                onChange={(e) => handlePropertyChange('limit', parseInt(e.target.value))}
                placeholder="Enter time limit"
              />
            </div>
          </div>
        )

      case 'audio':
      case 'dynamicAudio':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={elementProperties.name}
                onChange={(e) => handlePropertyChange('name', e.target.value)}
                placeholder="Element name"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Audio URL</Label>
              <Input
                value={!Array.isArray(elementProperties.content) ? elementProperties.content.src : ''}
                onChange={(e) => handlePropertyChange('src', e.target.value)}
                placeholder="Enter audio URL"
              />
            </div>

            <div className="space-y-2">
              <Label>Time Limit (seconds)</Label>
              <Input
                type="number"
                value={!Array.isArray(elementProperties.content) ? elementProperties.content.limit : ''}
                onChange={(e) => handlePropertyChange('limit', parseInt(e.target.value))}
                placeholder="Enter time limit"
              />
            </div>
          </div>
        )

      case 'image':
      case 'dynamicImage':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={elementProperties.name}
                onChange={(e) => handlePropertyChange('name', e.target.value)}
                placeholder="Element name"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input
                value={!Array.isArray(elementProperties.content) ? elementProperties.content.src : ''}
                onChange={(e) => handlePropertyChange('src', e.target.value)}
                placeholder="Enter image URL"
              />
            </div>
          </div>
        )

      case 'recordVideo':
      case 'inputRecordVideo':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={elementProperties.name}
                onChange={(e) => handlePropertyChange('name', e.target.value)}
                placeholder="Element name"
              />
            </div>

            <div className="space-y-2">
              <Label>Time Limit (seconds)</Label>
              <Input
                type="number"
                value={!Array.isArray(elementProperties.content) ? elementProperties.content.limit : ''}
                onChange={(e) => handlePropertyChange('limit', parseInt(e.target.value))}
                placeholder="Enter time limit"
              />
            </div>
          </div>
        )

      case 'recordAudio':
      case 'inputRecordAudio':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={elementProperties.name}
                onChange={(e) => handlePropertyChange('name', e.target.value)}
                placeholder="Element name"
              />
            </div>

            <div className="space-y-2">
              <Label>Time Limit (seconds)</Label>
              <Input
                type="number"
                value={!Array.isArray(elementProperties.content) ? elementProperties.content.limit : ''}
                onChange={(e) => handlePropertyChange('limit', parseInt(e.target.value))}
                placeholder="Enter time limit"
              />
            </div>
          </div>
        )

      default:
        return (
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={elementProperties.name}
              onChange={(e) => handlePropertyChange('name', e.target.value)}
              placeholder="Element name"
            />
          </div>
        )
    }
  }

  return (
    <div className="p-4 space-y-4 bg-background rounded-lg border">
      <div className="font-medium flex items-center gap-2">
        <span className="bg-primary/5 p-2 rounded-md">
          {element.name}
        </span>
      </div>
      {showProperties()}
    </div>
  )
}

export default PropertyPanel