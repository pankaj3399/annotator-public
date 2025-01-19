'use client'

import { EditorBtns } from '@/lib/constants'
import { EditorElement, useEditor } from '@/providers/editor/editor-provider'
import clsx from 'clsx'
import { Trash } from 'lucide-react'
import React from 'react'
import { FileUpload } from '@/components/FileUpload'

type Props = {
  element: EditorElement
}

const UploadInputComponent = (props: Props) => {
  const { dispatch, state } = useEditor()

  // Store the src URL for the file
  const [elementContent, setElementContent] = React.useState({
    src: !Array.isArray(props.element.content) ? props.element.content?.src || '' : ''
  })

  React.useEffect(() => {
    setElementContent({
      src: !Array.isArray(props.element.content) ? props.element.content?.src || '' : ''
        })
  }, [props.element])

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

  const handleDeleteElement = () => {
    dispatch({
      type: 'DELETE_ELEMENT',
      payload: { elementDetails: props.element },
    })
  }

  // Handle file upload (store only the URL)
  const handleFileUpload = (url: string) => {
    setElementContent(prev => ({ ...prev, src: url }))
    if (!Array.isArray(props.element.content)) {
      dispatch({
        type: 'UPDATE_ELEMENT',
        payload: {
          elementDetails: {
            ...props.element,
            content: {
              ...(props.element.content || {}),
              src: url,
            },
          },
        },
      })
    }
  }

  const isSelected = state.editor.selectedElement.id === props.element.id
  const isLiveMode = state.editor.liveMode
  const defaultWidth = props.element.styles?.width || '560px'
  const defaultHeight = props.element.styles?.height || '315px'

  return (
    <div
    style={props.element.styles}
    draggable
    onDragStart={(e) => handleDragStart(e, 'image')}
    onClick={handleOnClickBody}
    className={clsx(
      'p-[2px] w-full m-[5px] relative text-[16px] transition-all flex items-center justify-center border-dashed border-[1px] border-slate-300 rounded-lg',
      {
        '!border-blue-500': isSelected,
        '!border-solid': isSelected,
        'border-gray-300': !isLiveMode,
      }
    )}
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

    <div className="w-full flex flex-col items-center justify-center text-center space-y-4 p-4 relative">
      {isLiveMode ? (
        <div className="w-full mb-4">
          <FileUpload
            onUploadComplete={(url: string) => {
              handleFileUpload(url)
            }}
            currentFile={elementContent.src}
            accept=".pdf,.doc,.docx,.txt"
            uploadType="pdfUploader"
            label="Document"
          />
        </div>
      ) : (
        <div className="w-full mb-4 p-8 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg relative">
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-lg">
            <p className="text-gray-400 text-sm">Upload disabled in non-live mode</p>
          </div>
        </div>
      )}

      {elementContent.src && isLiveMode && (
        <iframe
          src={elementContent.src}
          width={defaultWidth}
          height="600"
          title="Uploaded Document"
          className="object-contain w-full mt-4 border-2 border-gray-300 rounded-lg"
        />
      )}

      {!elementContent.src && isLiveMode && (
        <p className="text-gray-500">No file uploaded yet</p>
      )}
    </div>
  </div>
  )
}

export default UploadInputComponent
