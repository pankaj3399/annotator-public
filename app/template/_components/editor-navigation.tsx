'use client'
import { updateTimer, upsertTemplate } from '@/app/actions/template'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { DeviceTypes, useEditor } from '@/providers/editor/editor-provider'
import clsx from 'clsx'
import {
  ArrowLeftCircle,
  EyeIcon,
  Laptop,
  Menu,
  Redo2,
  Smartphone,
  Tablet,
  Undo2,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FocusEventHandler, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { template } from '../page'
import { TimeSetterComponent } from '@/components/time-setter'

type Props = {
  pageId: string
  pageDetails: any
  projectId: string
}

const EditorNavigation = ({ pageId, pageDetails, projectId }: Props) => {
  const router = useRouter()
  const { state, dispatch } = useEditor()
  const [isMobileView, setIsMobileView] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    dispatch({
      type: 'SET_PAGE_ID',
      payload: { pageId: pageDetails.id },
    })
  }, [pageDetails, dispatch])

  const handleOnBlurTitleChange: FocusEventHandler<HTMLInputElement> = async (event) => {
    if (event.target.value === pageDetails.name) return
    if (event.target.value) {
      await upsertTemplate(
        projectId,
        {
          ...pageDetails,
          _id: pageDetails._id,
          name: event.target.value,
        } as template,
        pageId
      )
      toast('Success', { description: 'Saved Page title' })
      router.refresh()
    } else {
      toast('Oops!', { description: 'You need to have a title!' })
      event.target.value = pageDetails.name
    }
  }

  const handlePreviewClick = () => {
    dispatch({ type: 'TOGGLE_PREVIEW_MODE' })
    dispatch({ type: 'TOGGLE_LIVE_MODE' })
  }

  const handleUndo = () => dispatch({ type: 'UNDO' })
  const handleRedo = () => dispatch({ type: 'REDO' })

  const handleOnSave = async () => {
    const content = JSON.stringify(state.editor.elements)
    try {
      await upsertTemplate(
        projectId,
        {
          ...pageDetails,
          content,
          timer: undefined
        },
        pageId
      )
      toast('Success', { description: 'Saved Editor' })
    } catch (error) {
      toast('Oops!', { description: 'Could not save editor' })
    }
  }

  return (
    <TooltipProvider>
      <nav
        className={clsx(
          'fixed top-0 left-0 right-0 border-b bg-background flex items-center justify-between p-4 gap-2 transition-all z-50',
          {
            '!h-0 !p-0 !overflow-hidden': state.editor.previewMode,
          }
        )}
      >
        <aside className="flex items-center gap-4 flex-shrink-0">
          <Link href={`/projects/${projectId}`}>
            <ArrowLeftCircle className="h-5 w-5" />
          </Link>
          <div className="flex flex-col w-full max-w-[200px] md:max-w-[260px]">
            <Input
              defaultValue={pageDetails.name}
              className="border-none h-5 m-0 p-0 text-base md:text-lg truncate"
              onBlur={handleOnBlurTitleChange}
            />
          </div>
        </aside>

        <aside className="hidden md:block flex-shrink-0">
          <Tabs
            defaultValue="Desktop"
            className="w-fit"
            value={state.editor.device}
            onValueChange={(value) => {
              dispatch({
                type: 'CHANGE_DEVICE',
                payload: { device: value as DeviceTypes },
              })
            }}
          >
            <TabsList className="grid w-full grid-cols-3 bg-transparent h-fit">
              {['Desktop', 'Tablet', 'Mobile'].map((device) => (
                <Tooltip key={device}>
                  <TooltipTrigger>
                    <TabsTrigger
                      value={device}
                      className="data-[state=active]:bg-muted w-10 h-10 p-0"
                    >
                      {device === 'Desktop' ? (
                        <Laptop className="h-4 w-4" />
                      ) : device === 'Tablet' ? (
                        <Tablet className="h-4 w-4" />
                      ) : (
                        <Smartphone className="h-4 w-4" />
                      )}
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{device}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </TabsList>
          </Tabs>
        </aside>

        <aside className="flex items-center gap-2 flex-shrink-0">
          <div className="hidden sm:block">
            <TimeSetterComponent templateId={pageId} />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-slate-800"
            onClick={handlePreviewClick}
          >
            <EyeIcon className="h-4 w-4" />
          </Button>
          <div className="hidden sm:flex items-center gap-2">
            <Button
              disabled={!(state.history.currentIndex > 0)}
              onClick={handleUndo}
              variant="ghost"
              size="icon"
              className="hover:bg-slate-800"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              disabled={!(state.history.currentIndex < state.history.history.length - 1)}
              onClick={handleRedo}
              variant="ghost"
              size="icon"
              className="hover:bg-slate-800"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={handleOnSave} className="hidden sm:flex">
            Save
          </Button>
          {isMobileView && (
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden"
              onClick={() => dispatch({ type: 'TOGGLE_PREVIEW_MODE' })}
            >
              <Menu className="h-4 w-4" />
            </Button>
          )}
        </aside>
      </nav>
    </TooltipProvider>
  )
}

export default EditorNavigation