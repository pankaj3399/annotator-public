// Assuming this file is located at:
// /C:/Users/Ana Fariya/Desktop/annotator-public-2/app/template/_components/editor-sidebar/tabs/components-tab.tsx

import React from 'react';
import { EditorBtns } from '@/lib/constants'; // Make sure this path is correct
import AudioPlaceholder from './audio-placeholder'; // Adjust relative paths as needed
import CheckboxPlaceholder from './checkbox-placeholder';
import ContainerPlaceholder from './container-placeholder';
import DynamicAudioPlaceholder from './dynamic-audio-placeholder';
import DynamicImagePlaceholder from './dynamic-image-placeholder '; // Check space at the end
import DynamicTextPlaceholder from './dynamic-text-placeholder';
import DynamicVideoPlaceholder from './dynamic-video-placeholder '; // Check space at the end
import ImagePlaceholder from './image-placeholder';
import InputRecordAudioPlaceholder from './input-record-audio-placeholder';
import InputRecordVideoPlaceholder from './input-record-video-placeholder';
import InputTextPlaceholder from './input-text-placeholder';
import LinkPlaceholder from './link-placeholder';
import RecordAudioPlaceholder from './record-audio-placeholder';
import RecordVideoPlaceholder from './record-video-placeholder';
import TextPlaceholder from './text-placeholder';
import TwoColumnsPlaceholder from './two-columns-placeholder';
import VideoPlaceholder from './video-placeholder';
import { GripVertical } from 'lucide-react';
import DynamicUploadPlaceholder from './DynamicUploadPlaceholder'; // Adjust relative path
import DynamicCarousel from './carousal-placeholder'; // Adjust relative path
import UploadPlaceholder from './upload-placeholder'; // Adjust relative path
import UploadInputPlaceholder from './upload-input-placeholder'; // Adjust relative path

// Define the structure of an element
interface ElementDefinition {
  Component: React.ReactNode;
  label: string;
  id: EditorBtns;
  group: 'layout' | 'elements' | 'Dynamic Elements' | 'Inputs';
}

// Define the props for ComponentsTab
interface ComponentsTabProps {
  searchTerm: string;
}

const ComponentsTab = ({ searchTerm }: ComponentsTabProps) => {
  const elements: ElementDefinition[] = [
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
      Component: <UploadPlaceholder />,
      label: 'Upload',
      id: 'Upload',
      group: 'elements',
    },
    {
      Component: <UploadInputPlaceholder />,
      label: 'Upload',
      id: 'UploadInput',
      group: 'Inputs',
    },
    {
      Component: <CheckboxPlaceholder />,
      label: 'Checkbox', // corrected casing
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
      label: 'Carousel', // Corrected spelling
      id: 'dynamicCarousel',
      group: 'Dynamic Elements',
    },
  ];

  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    elementId: EditorBtns
  ) => {
    e.dataTransfer.setData('componentType', elementId as string);
  };

  // Filter elements based on the searchTerm prop
  // No implicit 'any' error here because 'element' type is inferred from 'elements' array type
  const filteredElements = elements.filter((element) =>
    element.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    // Removed outer w-full h-full bg-background as EditorSidebar controls layout
    <div>
       <h3 className="text-base font-medium text-gray-800 mb-3">Components</h3>
       <div className="space-y-2"> {/* Reduced spacing slightly */}
        {/* Map over the filtered list */}
        {filteredElements.map((element) => (
          <div
            key={element.id}
            draggable
            onDragStart={(e) => handleDragStart(e, element.id)}
            className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-md cursor-grab hover:bg-gray-50 active:cursor-grabbing" // Adjusted classes to match original EditorSidebar style
          >
            <div className="flex items-center gap-3">
              {/* Optional: Render icon if needed, or just the label */}
              {/* <div className="w-8 h-8 flex items-center justify-center">
                {React.isValidElement(element.Component) ? React.cloneElement(element.Component as React.ReactElement, {
                  className: 'w-5 h-5 text-muted-foreground', // Example class
                }) : null}
              </div> */}
              <span className="text-sm font-medium"> {/* Added font-medium */}
                {element.label}
                {/* Optional: Indicators for group */}
                {/* {element.group === 'Dynamic Elements' && (
                  <span className="ml-2 text-xs text-muted-foreground">(Dynamic)</span>
                )}
                {element.group === 'Inputs' && (
                  <span className="ml-2 text-xs text-muted-foreground">(Input)</span>
                )} */}
              </span>
            </div>
             {/* Drag handle */}
             <div className="flex items-center">
                <GripVertical className="w-4 h-4 text-gray-400" /> {/* Adjusted color */}
            </div>
          </div>
        ))}
        {filteredElements.length === 0 && (
           <p className="text-sm text-gray-500 text-center py-4">No elements found.</p>
        )}
      </div>
    </div>
  );
};

export default ComponentsTab;