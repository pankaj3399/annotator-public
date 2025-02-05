import { useEditor } from '@/providers/editor/editor-provider'
import clsx from 'clsx'
import ComponentsTab from './tabs/components-tab'
import SettingsTab from './tabs/settings-tab'
import PropertyPanel from '@/app/template/_components/editor/editor-components/propertypanel'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

type Props = {
  projectId: string
}

const EditorSidebar = ({ projectId }: Props) => {
  const { state } = useEditor()
  const hasSelectedElement = state.editor.selectedElement.id !== ''

  return (
    <>
      {/* Left Components Panel */}
      <div
        className={clsx(
          'fixed left-0 top-16 bottom-0 w-[280px] bg-background border-r z-40 transition-all duration-300 transform',
          {
            'translate-x-[-100%]': state.editor.previewMode,
            'translate-x-0': !state.editor.previewMode,
          }
        )}
      >
        <div className="h-full overflow-y-auto">
          <div className="py-6">
            <div className="text-left px-6 mb-6">
              <h2 className="text-lg font-semibold">Components</h2>
              <p className="text-sm text-muted-foreground">
                You can drag and drop components on the canvas
              </p>
            </div>
            <ComponentsTab />
          </div>
        </div>
      </div>

      {/* Right Properties Panel */}
      <div
        className={clsx(
          'fixed right-0 top-16 bottom-0 w-[320px] bg-background border-l z-40 transition-all duration-300 transform',
          {
            'translate-x-[100%]': state.editor.previewMode,
            'translate-x-0': !state.editor.previewMode,
          }
        )}
      >
        <div className="h-full overflow-y-auto">
          <div className="p-6">
            <div className="text-left mb-6">
              <h2 className="text-lg font-semibold">Properties</h2>
              <p className="text-sm text-muted-foreground">
                Show your creativity! You can customize every component as you like.
              </p>
            </div>
            
            {hasSelectedElement ? (
              <div className="space-y-6">
                {/* Properties Section */}
                <PropertyPanel />
                
                <Separator className="my-4" />
                
                {/* Styles Section */}
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="styles">
                    <AccordionTrigger>Styles</AccordionTrigger>
                    <AccordionContent>
                      <SettingsTab />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                Select an element to view its properties
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default EditorSidebar