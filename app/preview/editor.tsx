'use client'
import Recursive from '@/app/template/_components/editor/editor-components/recursive'
import { Button } from '@/components/ui/button'
import { useEditor } from '@/providers/editor/editor-provider'
import clsx from 'clsx'
import { EyeOff } from 'lucide-react'
import { useEffect } from 'react'
import { getTemplate } from '../actions/template'

type Props = { pageId: string; liveMode?: boolean }

const Editor = ({ pageId, liveMode }: Props) => {
  const { dispatch, state } = useEditor()

  useEffect(() => {
    if (liveMode) {
      dispatch({
        type: 'TOGGLE_LIVE_MODE',
        payload: { value: true },
      })
    }
  }, [liveMode, dispatch])

  //CHALLENGE: make this more performant
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = JSON.parse(await getTemplate(pageId));
        if (!response) return;

        // Sanitize the content string (if needed)
        let content = response.content;
        // Example: Remove control characters using a regular expression
        content = content.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');

        const parsedContent = JSON.parse(content);

        dispatch({
          type: 'LOAD_DATA',
          payload: {
            elements: parsedContent,
            withLive: !!liveMode,
          },
        });
      } catch (error) {
        console.error('Error parsing JSON:', error);
        // Handle the error appropriately (e.g., display a message to the user)
      }
    };
    fetchData()
  }, [liveMode,pageId, dispatch])

  const handleClick = () => {
    dispatch({
      type: 'CHANGE_CLICKED_ELEMENT',
      payload: {},
    })
  }

  const handleUnpreview = () => {
    dispatch({ type: 'TOGGLE_PREVIEW_MODE' })
    dispatch({ type: 'TOGGLE_LIVE_MODE' })
  }
  return (
    <div
      className={clsx(
        'use-automation-zoom-in h-full overflow-scroll mr-[385px] bg-background transition-all rounded-md',
        {
          '!p-0 !mr-0':
            state.editor.previewMode === true || state.editor.liveMode === true,
          '!w-[850px]': state.editor.device === 'Tablet',
          '!w-[420px]': state.editor.device === 'Mobile',
          'w-full': state.editor.device === 'Desktop',
        }
      )}
      onClick={handleClick}
    >
      {state.editor.previewMode && state.editor.liveMode && (
        <Button
          variant={'ghost'}
          size={'icon'}
          className="w-6 h-6 bg-slate-600 p-[2px] fixed top-0 left-0 z-[100]"
          onClick={handleUnpreview}
        >
          <EyeOff />
        </Button>
      )}
      {Array.isArray(state.editor.elements) &&
        state.editor.elements.map((childElement) => (
          <Recursive
            key={childElement.id}
            element={childElement}
          />
        ))}
    </div>
  )
}

export default Editor
