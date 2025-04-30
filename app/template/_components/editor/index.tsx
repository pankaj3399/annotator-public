'use client'
import { getTemplate } from '@/app/actions/template'
import { useEditor } from '@/providers/editor/editor-provider'
// Import necessary types and functions for drag/drop
import React, { useEffect, DragEvent } from 'react' // Import DragEvent
import { EditorBtns } from '@/lib/constants' // Assuming EditorBtns defines your component types
import { v4 as uuidv4 } from 'uuid'; // Import uuid to generate unique IDs

import Recursive from './editor-components/recursive'
import { cn } from '@/lib/utils'

type Props = { pageId: string; liveMode?: boolean }

const Editor = ({ pageId, liveMode }: Props) => {
  const { dispatch, state } = useEditor()
  const isPreviewMode = state.editor.previewMode

  useEffect(() => {
    if (liveMode) {
      dispatch({
        type: 'TOGGLE_LIVE_MODE',
        payload: { value: true },
      })
    }
  }, [liveMode, dispatch])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const templateData = await getTemplate(pageId);
        // console.log("Raw template data:", templateData); // Debugging

        // Check if templateData is null or empty string before parsing
        if (!templateData) {
          console.warn("No template data found for pageId:", pageId);
          // Optionally dispatch an action to clear elements or set a default state
          dispatch({
            type: 'LOAD_DATA',
            payload: { elements: [], withLive: !!liveMode },
          });
          return;
        }

        const response = JSON.parse(templateData);
        // console.log("Parsed response:", response); // Debugging

        if (!response) return;

        // Ensure content is parsed if it exists and is a string
        let contentElements = [];
        if (response.content && typeof response.content === 'string') {
          try {
            contentElements = JSON.parse(response.content);
          } catch (parseError) {
            console.error("Failed to parse response.content:", parseError);
            contentElements = []; // Default to empty array on parse error
          }
        } else if (Array.isArray(response.content)) {
           contentElements = response.content; // Use directly if already an array
        }

        // console.log("Dispatching LOAD_DATA with elements:", contentElements); // Debugging

        dispatch({
          type: 'LOAD_DATA',
          payload: {
            elements: Array.isArray(contentElements) ? contentElements : [], // Ensure it's always an array
            withLive: !!liveMode,
          },
        });
      } catch (error) {
        console.error("Error fetching or processing template:", error);
         // Handle error state appropriately, e.g., dispatch empty data
         dispatch({
            type: 'LOAD_DATA',
            payload: { elements: [], withLive: !!liveMode },
          });
      }
    };
    fetchData();
  }, [pageId, dispatch, liveMode]);


  const handleClick = () => {
    if (!isPreviewMode) {
      dispatch({
        type: 'CHANGE_CLICKED_ELEMENT',
        payload: {},
      })
    }
  }

  // --- DRAG AND DROP HANDLERS ---

  const handleDragOver = (e: DragEvent) => {
    // Prevent default to allow drop
    e.preventDefault();
    // Optional: Add visual feedback (e.g., change background)
    // console.log("Dragging over...");
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault(); // Prevent default browser behavior (e.g., opening file)
    e.stopPropagation(); // Stop event from bubbling up if needed

    // Only allow dropping in edit mode
    if (isPreviewMode) return;

    const componentType = e.dataTransfer.getData('componentType') as EditorBtns;
    // console.log(`Dropped component type: ${componentType}`); // Debugging

    // Check if componentType is valid before dispatching
    if (!componentType) {
        console.error("Dropped item is missing 'componentType' data.");
        return;
    }

    // Dispatch action to add the new element to the state
    dispatch({
      type: 'ADD_ELEMENT',
      payload: {
        elementDetails: {
          id: uuidv4(), // Generate a unique ID
          content: [], // Default content (empty for containers, specific for others if needed)
          name: `${componentType} Component`, // Default name
          styles: {}, // Default styles
          type: componentType,
        },
        // You might need containerId if dropping into a specific container
        // For root level drop, it might be null or the body ID
        containerId: '__body' // Assuming drop on main canvas adds to body
      },
    });
  }

  // --- END DRAG AND DROP HANDLERS ---

  return (
    <div
      className={cn(
        "h-full overflow-auto",
        // Add a class to indicate drop zone in edit mode maybe?
        !isPreviewMode && "editor-drop-zone-bg", // Example optional class
        isPreviewMode ? "bg-white p-0" : "bg-gray-50 p-6"
      )}
      onClick={handleClick}
      // Add drop handlers to the main scrollable container
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className={cn(
        "bg-white border border-gray-200 rounded-md min-h-[80vh]",
        isPreviewMode ? "border-0 shadow-none" : "p-6"
        // If you only want the inner white area to be the drop zone,
        // move onDragOver and onDrop handlers here instead of the outer div.
      )}>
        {!isPreviewMode && (
          <>
            <h2 className="text-lg font-medium text-gray-800 mb-2">Test Canvas</h2>
            <p className="text-sm text-gray-500 mb-6">
              Drag elements from the sidebar and drop them here
            </p>
          </>
        )}

        {/* This inner div is often the specific target for dropping elements */}
        <div
          className={cn(
            "space-y-4",
            isPreviewMode ? "p-6" : ""
            // You could potentially add onDragOver/onDrop HERE instead of the outermost div
            // if you want dropping only inside this specific mapped area.
            // The outer div is fine too, depends on desired UX.
          )}
           // Example: Add handlers here instead if preferred
           // onDragOver={handleDragOver}
           // onDrop={handleDrop}
        >
          {Array.isArray(state.editor.elements) && state.editor.elements.length > 0 ? (
            state.editor.elements.map((element) => (
              element.id !== '__body' ? (
                <Recursive key={element.id} element={element} />
              ) : (
                // Render content of '__body' directly if it's the root
                element.content && Array.isArray(element.content) && element.content.length > 0 ? (
                  element.content.map((childElement) => (
                    <Recursive key={childElement.id} element={childElement} />
                  ))
                ) : null
              )
            ))
          ) : (
            // Show empty state only in edit mode, not in preview
            !isPreviewMode && (
              <div className="flex flex-col items-center justify-center py-16 text-center min-h-[200px]"> {/* Added min-height */}
                <div className="text-gray-400 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M9 9h.01M15 9h.01M9 15h.01M15 15h.01M9 12h6" />
                  </svg>
                </div>
                <h3 className="text-base font-medium text-gray-800">No elements added</h3>
                <p className="mt-1 text-sm text-gray-500 max-w-sm">
                  Drag and drop elements from the sidebar to start building your test
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}

export default Editor