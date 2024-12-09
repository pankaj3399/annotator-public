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
import { GripVertical } from 'lucide-react';
import DynamicUploadPlaceholder from './DynamicUploadPlaceholder';
import DynamicCarousel from './carousal-placeholder'


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

    {
      Component: <DynamicUploadPlaceholder />,
      label: 'Upload File',
      id: 'dynamicUpload',
      group: 'Dynamic Elements',
    },

    {
      Component: <DynamicCarousel />,
      label: 'Carousal',
      id: 'dynamicCarousel',
      group: 'Dynamic Elements',
    },
  ]

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, elementId: EditorBtns) => {
    e.dataTransfer.setData('componentType', elementId as string);
  };
  const allElements = elements;

  return (
    <div className="w-full h-full bg-background">
      <div className="p-4">
        <h2 className="text-xl font-semibold mb-4">Components</h2>
        <div className="space-y-3">
          {allElements.map((element) => (
            <div
              key={element.id}
              draggable
              onDragStart={(e) => handleDragStart(e, element.id)}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-grab active:cursor-grabbing border-2"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center">
                  {React.cloneElement(element.Component as React.ReactElement, {
                    className: 'w-5 h-5 text-muted-foreground',
                  })}
                </div>
                <span className="text-sm">
                  {element.label}
                  {element.group === 'Dynamic Elements' && (
                  <span className="ml-2 text-xs text-muted-foreground">(Dynamic)</span>
                  )}
                  {element.group === 'Inputs' && (
                  <span className="ml-2 text-xs text-muted-foreground">(Input)</span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-muted-foreground" />
              
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};


export default ComponentsTab
