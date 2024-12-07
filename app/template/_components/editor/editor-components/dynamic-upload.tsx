"use client";

import { EditorBtns } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { EditorElement, useEditor } from "@/providers/editor/editor-provider";
import { Button } from "@/components/ui/button";
import clsx from "clsx";
import { FileIcon, Trash, Upload } from "lucide-react";
import React from "react";

type Props = {
  element: EditorElement;
};

const DynamicUploadComponent = (props: Props) => {
  const { dispatch, state } = useEditor();

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

  return (
    <div
      style={props.element.styles}
      draggable
      onDragStart={(e) => handleDragStart(e, "dynamicUpload")}
      onClick={handleOnClickBody}
      className={clsx(
        "p-[2px] w-full m-[5px] relative text-[16px] transition-all flex items-center justify-center",
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
    </div>
  );
};

export default DynamicUploadComponent;
