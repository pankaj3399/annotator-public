import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, } from '@/components/ui/accordion'
import { EditorBtns } from '@/lib/constants'
import React from 'react'
import AudioPlaceholder from './audio-placeholder'
import CheckboxPlaceholder from './checkbox-placeholder'
import ContainerPlaceholder from './container-placeholder'
import DynamicAudioPlaceholder from './dynamic-audio-placeholder'
import DynamicImagePlaceholder from './dynamic-image-placeholder '
import DynamicTextPlaceholder from './dynamic-text-placeholder'
import DynamicVideoPlaceholder from './dynamic-video-placeholder '
import ImagePlaceholder from './image-placeholder'
import InputRecordAudioPlaceholder from './input-record-audio-placeholder'
import InputRecordVideoPlaceholder from './input-record-video-placeholder'
import InputTextPlaceholder from './input-text-placeholder'
import LinkPlaceholder from './link-placeholder'
import RecordAudioPlaceholder from './record-audio-placeholder'
import RecordVideoPlaceholder from './record-video-placeholder'
import TextPlaceholder from './text-placeholder'
import TwoColumnsPlaceholder from './two-columns-placeholder'
import VideoPlaceholder from './video-placeholder'


const ComponentsTab = () => {
  const elements: {
    Component: React.ReactNode
    label: string
    id: EditorBtns
    group: 'layout' | 'elements' | 'Dynamic Elements' | 'Inputs'
  }[] = [
    {
      Component: <TextPlaceholder />,
      label: 'Text',
      id: 'text',
      group: 'elements',
    },
    {
      Component: <DynamicTextPlaceholder />,
      label: 'Text',
      id: 'dynamicText',
      group: 'Dynamic Elements',
    },
    {
      Component: <InputTextPlaceholder />,
      label: 'Text',
      id: 'inputText',
      group: 'Inputs',
    },
    {
      Component: <InputRecordAudioPlaceholder />,
      label: 'Record Audio',
      id: 'inputRecordAudio',
      group: 'Inputs',
    },
    {
      Component: <InputRecordVideoPlaceholder />,
      label: 'Record Video',
      id: 'inputRecordVideo',
      group: 'Inputs',
    },
    {
      Component: <CheckboxPlaceholder />,
      label: 'checkbox',
      id: 'checkbox',
      group: 'Inputs',
    },
    // {
    //   Component: <DynamicCheckboxPlaceholder />,
    //   label: 'Dynamic Checkbox',
    //   id: 'dynamicCheckbox',
    //   group: 'Inputs',
    // },
    {
      Component: <RecordAudioPlaceholder />,
      label: 'Record Audio',
      id: 'recordAudio',
      group: 'elements',
    },
    {
      Component: <RecordVideoPlaceholder />,
      label: 'Record Video',
      id: 'recordVideo',
      group: 'elements',
    },
    {
      Component: <DynamicVideoPlaceholder />,
      label: 'Video',
      id: 'dynamicVideo',
      group: 'Dynamic Elements',
    },
    {
      Component: <DynamicImagePlaceholder />,
      label: 'Image',
      id: 'dynamicImage',
      group: 'Dynamic Elements',
    },
    {
      Component: <AudioPlaceholder />,
      label: 'Audio',
      id: 'audio',
      group: 'elements',
    },
    {
      Component: <DynamicAudioPlaceholder />,
      label: 'Audio',
      id: 'dynamicAudio',
      group: 'Dynamic Elements',
    },
    {
      Component: <ImagePlaceholder />,
      label: 'Image',
      id: 'image',
      group: 'elements',
    },
    {
      Component: <ContainerPlaceholder />,
      label: 'Container',
      id: 'container',
      group: 'layout',
    },
    {
      Component: <TwoColumnsPlaceholder />,
      label: '2 Columns',
      id: '2Col',
      group: 'layout',
    },
    {
      Component: <VideoPlaceholder />,
      label: 'Video',
      id: 'video',
      group: 'elements',
    },
    {
      Component: <LinkPlaceholder />,
      label: 'Link',
      id: 'link',
      group: 'elements',
    },
  ]

  return (
    <Accordion
      type="multiple"
      className="w-full"
      defaultValue={['Layout', 'Elements','Dynamic Elements','Inputs']}
    >
      <AccordionItem
        value="Layout"
        className="px-6 py-0 border-y-[1px]"
      >
        <AccordionTrigger className="!no-underline">Layout</AccordionTrigger>
        <AccordionContent className="flex flex-wrap gap-2 ">
          {elements
            .filter((element) => element.group === 'layout')
            .map((element) => (
              <div
                key={element.id}
                className="flex-col items-center justify-center flex"
              >
                {element.Component}
                <span className="text-muted-foreground">{element.label}</span>
              </div>
            ))}
        </AccordionContent>
      </AccordionItem>
      <AccordionItem
        value="Elements"
        className="px-6 py-0 "
      >
        <AccordionTrigger className="!no-underline">Elements</AccordionTrigger>
        <AccordionContent className="flex flex-wrap gap-2 ">
          {elements
            .filter((element) => element.group === 'elements')
            .map((element) => (
              <div
                key={element.id}
                className="flex-col items-center justify-center flex"
              >
                {element.Component}
                <span className="text-muted-foreground text-center max-w-10">{element.label}</span>
              </div>
            ))}
        </AccordionContent>
      </AccordionItem>
      <AccordionItem
        value="Dynamic Elements"
        className="px-6 py-0 "
      >
        <AccordionTrigger className="!no-underline">Dynamic Elements</AccordionTrigger>
        <AccordionContent className="flex flex-wrap gap-2 ">
          {elements
            .filter((element) => element.group === 'Dynamic Elements')
            .map((element) => (
              <div
                key={element.id}
                className="flex-col items-center justify-center flex"
              >
                {element.Component}
                <span className="text-muted-foreground">{element.label}</span>
              </div>
            ))}
        </AccordionContent>
      </AccordionItem>
      <AccordionItem
        value="Inputs"
        className="px-6 py-0 "
      >
        <AccordionTrigger className="!no-underline">Inputs</AccordionTrigger>
        <AccordionContent className="flex flex-wrap gap-2 ">
          {elements
            .filter((element) => element.group === 'Inputs')
            .map((element) => (
              <div
                key={element.id}
                className="flex-col items-center justify-center flex"
              >
                {element.Component}
                <span className="text-muted-foreground">{element.label}</span>
              </div>
            ))}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

export default ComponentsTab
