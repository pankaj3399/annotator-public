'use client'

import { useEditor } from '@/providers/editor/editor-provider'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import ComponentsTab from './tabs/components-tab' // Make sure this path is correct

type Props = {
  projectId: string
}

const EditorSidebar = ({ projectId }: Props) => {
  const { state } = useEditor()
  const [searchTerm, setSearchTerm] = useState('')

  // Removed filtering logic from here

  if (state.editor.previewMode) return null

  return (
    <div className="h-full flex flex-col">
      {/* UI Elements section */}
      <div className="p-4 pb-0"> {/* Adjusted padding */}
        <h2 className="text-base font-medium text-gray-800">UI Elements</h2>
        <p className="text-sm text-gray-500 mt-1 mb-4">
          Drag and drop elements onto the canvas
        </p>
      </div>

      {/* Search box */}
      <div className="p-4 pt-0 pb-3"> {/* Adjusted padding */}
        <div className="relative">
          <svg
            className="absolute left-3 top-2.5 h-4 w-4 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <path d="M21 21l-4.35-4.35"></path>
          </svg>
          <Input
            placeholder="Search elements..."
            className="pl-9 bg-white border-gray-200"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Components section - Renders ComponentsTab once */}
      <div className="flex-grow overflow-y-auto p-4 pt-0"> {/* Adjusted padding and added flex-grow for scrolling */}
         {/* Removed the h3 title from here as it's likely handled within ComponentsTab or implicit */}
         {/* Removed the outer mapping loop */}
         {/* Pass the searchTerm to ComponentsTab */}
         <ComponentsTab searchTerm={searchTerm} />
      </div>
    </div>
  )
}

export default EditorSidebar