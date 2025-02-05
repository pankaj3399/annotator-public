"use client";

import { EditorBtns } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { EditorElement, useEditor } from "@/providers/editor/editor-provider";
import { Button } from "@/components/ui/button";
import clsx from "clsx";
import { FileIcon, Trash, Upload } from "lucide-react";
import React from "react";
import AudioPlayer from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';
import ReactPlayer from 'react-player';

type Props = {
  element: EditorElement;
};

const DynamicUploadComponent = (props: Props) => {
  const { dispatch, state } = useEditor();
  const [elementContent, setElementContent] = React.useState({
    src: !Array.isArray(props.element.content) ? props.element.content?.src || '' : ''
  });

  React.useEffect(() => {
    setElementContent({
      src: !Array.isArray(props.element.content) ? props.element.content?.src || '' : ''
    });
  }, [props.element]);

  const handleDragStart = (e: React.DragEvent, type: EditorBtns) => {
    if (type === null) return;
    e.dataTransfer.setData("componentType", type);
  };

  const handleOnClickBody = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({
      type: "CHANGE_CLICKED_ELEMENT",
      payload: {
        elementDetails: props.element,
      },
    });
  };

  const handleDeleteElement = () => {
    dispatch({
      type: "DELETE_ELEMENT",
      payload: { elementDetails: props.element },
    });
  };

  const isSelected = state.editor.selectedElement.id === props.element.id;
  const isLiveMode = state.editor.liveMode;

  const defaultWidth = props.element.styles?.width || '560px';
  const defaultHeight = props.element.styles?.height || '315px';

  const renderContent = () => {
    if (!isLiveMode) {
      return (
        <div className="w-full max-w-xl p-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <FileIcon className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-2">
              <p className="text-sm text-gray-600">File upload</p>
              <p className="text-xs text-gray-500 mt-1">Upload any file</p>
            </div>
            <Button variant="outline" className="mt-4">
              <Upload className="h-4 w-4 mr-2" />
              File
            </Button>
          </div>
        </div>
      );
    }

    switch (props.element.type) {
      case 'dynamicImage':
        return (
          <img
            src={elementContent.src}
            width={defaultWidth}
            height={defaultHeight}
            alt="Dynamic content"
            className="object-contain"
          />
        );
      
      case 'dynamicVideo':
        return (
          <ReactPlayer
            url={elementContent.src}
            width={defaultWidth}
            height={defaultHeight}
            className="max-w-full"
          />
        );
      
      case 'dynamicAudio':
        return (
          <div className="w-full">
            <AudioPlayer
              autoPlay={false}
              src={elementContent.src}
              className="w-full"
            />
          </div>
        );
      
      case 'dynamicText':
        return (
          <div className="w-full">
            {elementContent.src}
            </div>
        )
        
      case 'dynamicUpload':
      default:
        if (!elementContent.src) return <div>No content provided</div>;
        return (
          <div 
            className="outline-none w-full"
          >
            {elementContent.src}
          </div>
        );
    }
  };

  return (
    <div
      style={props.element.styles}
      draggable
      onDragStart={(e) => handleDragStart(e, "dynamicUpload")}
      onClick={handleOnClickBody}
      className={clsx(
        "p-[2px] w-full m-[5px] relative text-[16px] transition-all",
        {
          "!border-blue-500": isSelected,
          "!border-solid": isSelected,
          "border-dashed border-[1px] border-slate-300": !isLiveMode,
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

      {!isLiveMode ? (
        <div className={cn('w-fit h-fit bg-muted rounded-lg p-2')}>
          <div className="mb-2 text-sm text-muted-foreground">Content will appear here</div>
          {renderContent()}
        </div>
      ) : (
        renderContent()
      )}
    </div>
  );
};

export default DynamicUploadComponent;