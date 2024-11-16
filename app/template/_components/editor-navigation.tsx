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
  Redo2,
  Smartphone,
  Tablet,
  Undo2,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FocusEventHandler, useEffect } from 'react'
import { toast } from 'sonner'
import { template } from '../page'
import { TimeSetterComponent } from '@/components/time-setter'

type Props = {
  pageId: string
  pageDetails: any
  projectId: string
}

const EditorNavigation = ({
  pageId,
  pageDetails,
  projectId,
}: Props) => {
  const router = useRouter()
  const { state, dispatch } = useEditor()

  useEffect(() => {
    dispatch({
      type: 'SET_PAGE_ID',
      payload: { pageId: pageDetails.id },
    })
  }, [pageDetails,dispatch])

  const handleOnBlurTitleChange: FocusEventHandler<HTMLInputElement> = async (
    event
  ) => {
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

      toast('Success', {
        description: 'Saved Page title',
      })
      router.refresh()
    } else {
      toast('Oppse!', {
        description: 'You need to have a title!',
      })
      event.target.value = pageDetails.name
    }
  }

  const handlePreviewClick = () => {
    dispatch({ type: 'TOGGLE_PREVIEW_MODE' })
    dispatch({ type: 'TOGGLE_LIVE_MODE' })
  }

  const handleUndo = () => {
    dispatch({ type: 'UNDO' })
  }

  const handleRedo = () => {
    dispatch({ type: 'REDO' })
  }

  const handleOnSave = async () => {
    const content = JSON.stringify(state.editor.elements)
    try {
      await upsertTemplate(
        projectId,
        {
          ...pageDetails,
          content,
        },
        pageId
      )

      toast('Success', {
        description: 'Saved Editor',
      })
    } catch (error) {
      toast('Oppse!', {
        description: 'Could not save editor',
      })
    }
  }

  return (
    <TooltipProvider>
      <nav
        className={clsx(
          'border-b-[1px] flex items-center justify-between p-4 gap-2 transition-all',
          { '!h-0 !p-0 !overflow-hidden': state.editor.previewMode }
        )}
      >
        <aside className="flex items-center gap-4 max-w-[260px] w-[300px]">
          <Link href={`/projects/${projectId}`}>
            <ArrowLeftCircle />
          </Link>
          <div className="flex flex-col w-full ">
            <Input
              defaultValue={pageDetails.name}
              className="border-none h-5 m-0 p-0 text-lg"
              onBlur={handleOnBlurTitleChange}
            />
     
          </div>
        </aside>
        <aside>
          <Tabs
            defaultValue="Desktop"
            className="w-fit "
            value={state.editor.device}
            onValueChange={(value) => {
              dispatch({
                type: 'CHANGE_DEVICE',
                payload: { device: value as DeviceTypes },
              })
            }}
          >
            <TabsList className="grid w-full grid-cols-3 bg-transparent h-fit">
              <Tooltip>
                <TooltipTrigger>
                  <TabsTrigger
                    value="Desktop"
                    className="data-[state=active]:bg-muted w-10 h-10 p-0"
                  >
                    <Laptop />
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Desktop</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger>
                  <TabsTrigger
                    value="Tablet"
                    className="w-10 h-10 p-0 data-[state=active]:bg-muted"
                  >
                    <Tablet />
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Tablet</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger>
                  <TabsTrigger
                    value="Mobile"
                    className="w-10 h-10 p-0 data-[state=active]:bg-muted"
                  >
                    <Smartphone />
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Mobile</p>
                </TooltipContent>
              </Tooltip>
            </TabsList>
          </Tabs>
        </aside>
        <aside className="flex items-center gap-2">
          <TimeSetterComponent templateId={pageId} />
          <Button
            variant={'ghost'}
            size={'icon'}
            className="hover:bg-slate-800"
            onClick={handlePreviewClick}
          >
            <EyeIcon />
          </Button>
          <Button
            disabled={!(state.history.currentIndex > 0)}
            onClick={handleUndo}
            variant={'ghost'}
            size={'icon'}
            className="hover:bg-slate-800"
          >
            <Undo2 />
          </Button>
          <Button
            disabled={
              !(state.history.currentIndex < state.history.history.length - 1)
            }
            onClick={handleRedo}
            variant={'ghost'}
            size={'icon'}
            className="hover:bg-slate-800 mr-4"
          >
            <Redo2 />
          </Button>
        
          <Button onClick={handleOnSave}>Save</Button>
        </aside>
      </nav>
    </TooltipProvider>
  )
}

export default EditorNavigation
