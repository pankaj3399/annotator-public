'use client'

import { EditorElement, useEditor } from '@/providers/editor/editor-provider'
import { Textarea } from '@/components/ui/textarea'
import { Button } from "@/components/ui/button"
import { Trash } from 'lucide-react'
import { toast } from 'sonner'
import clsx from 'clsx'
import React, { useState, useEffect } from 'react'

type Props = {
  element: EditorElement
}

const InputText = (props: Props) => {
  const { dispatch, state, pageDetails } = useEditor()

  const [elementContent, setElementContent] = useState({
    innerText: !Array.isArray(props.element.content) ? props.element.content?.innerText || '' : '',
    charLimit: !Array.isArray(props.element.content) ? props.element.content?.limit || 10000 : 10000,
    wordLimit: !Array.isArray(props.element.content) ? props.element.content?.wordLimit || 1000 : 1000,
    copyAllowed: !Array.isArray(props.element.content) ? props.element.content.copyAllowed || false : false,
    // Translation settings
    translationEnabled: !Array.isArray(props.element.content) ? props.element.content?.translationEnabled || false : false,
    translationModel: !Array.isArray(props.element.content) ? props.element.content?.translationModel || 'deepl' : 'deepl',
    translationApiKey: !Array.isArray(props.element.content) ? props.element.content?.translationApiKey || '' : '',
    sourceLanguage: !Array.isArray(props.element.content) ? props.element.content?.sourceLanguage || 'auto' : 'auto',
    targetLanguage: !Array.isArray(props.element.content) ? props.element.content?.targetLanguage || 'en' : 'en',
    translation: !Array.isArray(props.element.content) ? props.element.content?.translation || '' : ''
  })

  const [showNotification, setShowNotification] = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)

  useEffect(() => {
    setElementContent({
      innerText: !Array.isArray(props.element.content) ? props.element.content?.innerText || '' : '',
      charLimit: !Array.isArray(props.element.content) ? props.element.content?.limit || 10000 : 10000,
      wordLimit: !Array.isArray(props.element.content) ? props.element.content?.wordLimit || 1000 : 1000,
      copyAllowed: !Array.isArray(props.element.content) ? props.element.content.copyAllowed || false : false,
      // Translation settings
      translationEnabled: !Array.isArray(props.element.content) ? props.element.content?.translationEnabled || false : false,
      translationModel: !Array.isArray(props.element.content) ? props.element.content?.translationModel || 'deepl' : 'deepl',
      translationApiKey: !Array.isArray(props.element.content) ? props.element.content?.translationApiKey || '' : '',
      sourceLanguage: !Array.isArray(props.element.content) ? props.element.content?.sourceLanguage || 'auto' : 'auto',
      targetLanguage: !Array.isArray(props.element.content) ? props.element.content?.targetLanguage || 'en' : 'en',
      translation: !Array.isArray(props.element.content) ? props.element.content?.translation || '' : ''
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

  const countWords = (text: string) => text.trim().split(/\s+/).length

  const handleContentChange = (value: string) => {
    const wordCount = countWords(value)

    // Only update if within limits
    if (value.length <= elementContent.charLimit && wordCount <= elementContent.wordLimit) {
      setElementContent((prev) => ({ ...prev, innerText: value }))

      dispatch({
        type: 'UPDATE_ELEMENT',
        payload: {
          elementDetails: {
            ...props.element,
            content: {
              ...((!Array.isArray(props.element.content) && props.element.content) || {}),
              innerText: value,
            },
          },
        },
      })
    }
  }
  
  const handleTranslationChange = (value: string) => {
    setElementContent((prev) => ({ ...prev, translation: value }))
    
    dispatch({
      type: 'UPDATE_ELEMENT',
      payload: {
        elementDetails: {
          ...props.element,
          content: {
            ...((!Array.isArray(props.element.content) && props.element.content) || {}),
            translation: value,
          },
        },
      },
    })
  }
  
  const handleTranslate = async () => {
    if (!elementContent.translationEnabled) {
      toast.error('Translation is not enabled for this input')
      return
    }

    if (!elementContent.innerText) {
      toast.error('No text to translate')
      return
    }

    setIsTranslating(true)
    
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
          targetLanguage: elementContent.targetLanguage
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Translation failed')
      }

      const data = await response.json()
      const newTranslation = data.translation

      // Update state and element
      setElementContent((prev) => ({ ...prev, translation: newTranslation }))
      
      dispatch({
        type: 'UPDATE_ELEMENT',
        payload: {
          elementDetails: {
            ...props.element,
            content: {
              ...((!Array.isArray(props.element.content) && props.element.content) || {}),
              translation: newTranslation
            },
          },
        },
      })
      
      toast.success('Translation completed successfully')
    } catch (error) {
      console.error('Translation error:', error)
      toast.error(error instanceof Error ? error.message : 'Error occurred during translation')
    } finally {
      setIsTranslating(false)
    }
  }

  const isSelected = state.editor.selectedElement.id === props.element.id
  const isLiveMode = state.editor.liveMode
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if(elementContent.copyAllowed === true){
      return
    }
    else{
      e.preventDefault()
      setShowNotification(true)
      setTimeout(() => {
        setShowNotification(false)
      }, 2000)
    }
  }

  return (
    <div
      style={props.element.styles}
      className={clsx(
        'p-[2px] w-full m-[5px] relative text-[16px] transition-all flex flex-col items-center justify-center',
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

      <form className="flex w-full items-center space-x-2 relative mb-2">
        <Textarea
          onPaste={handlePaste}
          placeholder="Write here"
          required
          value={elementContent.innerText}
          maxLength={elementContent.charLimit}
          disabled={pageDetails.submitted}
          onChange={(e) => handleContentChange(e.target.value)}
          className="w-full"
        />
        {showNotification && (
          <div
            className="absolute top-[-30px] right-10 bg-red-500 text-white text-xs px-2 py-1 rounded-md shadow-lg animate-fade-in-out"
          >
            Pasting is not allowed
          </div>
        )}
      </form>
      
      {/* Translation UI */}
      {isLiveMode && elementContent.translationEnabled &&  (
        <div className="w-full mt-2 border-t pt-4 px-4 pb-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium">Translation</h3>
            {!pageDetails.submitted && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleTranslate}
          disabled={isTranslating || !elementContent.innerText}
        >
          {isTranslating ? 'Translating...' : 'Translate'}
        </Button>
      )}
          </div>
          
          <Textarea
            value={elementContent.translation}
            onChange={(e) => handleTranslationChange(e.target.value)}
            placeholder={elementContent.innerText ? "Translation will appear here after clicking 'Translate'" : "Enter text above, then translate it"}
            className="min-h-[120px] resize-y w-full"
          />

        </div>
      )}
    </div>
  )
}

export default InputText