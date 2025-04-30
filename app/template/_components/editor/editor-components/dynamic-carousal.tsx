"use client";

import { EditorBtns } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { EditorElement, useEditor } from "@/providers/editor/editor-provider";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { useEffect, useState, useRef } from "react";
import { Trash, Settings, X } from "lucide-react";
import clsx from "clsx";
import ReactPlayer from "react-player";
import { useKeyboardNavigation } from "./use-keyboard-navigation";
import PropertyPanel from "@/app/template/_components/editor/editor-components/propertypanel";

type Props = {
  element: EditorElement;
};

type SlideContentType = {
  type: string;
  src?: string;
  innerText?: string;
};

const SlideContent = ({
  content,
  isLiveMode,
}: {
  content: SlideContentType;
  isLiveMode: boolean;
}) => {
  const defaultWidth = "180px";
  const defaultHeight = "315px";

  switch (content.type) {
    case "image":
      return isLiveMode ? (
        <div className="w-full h-full flex items-center justify-center">
          <img
            src={content.src}
            alt="Carousel image"
            style={{ width: defaultWidth, height: defaultHeight }}
          />
        </div>
      ) : (
        <div className="bg-muted rounded-lg p-2 w-full h-full flex items-center justify-center">
          <div className="text-center">
            <div className="mb-2 text-sm text-muted-foreground">
              Image will be here
            </div>
            <img
              src={content.src}
              alt="Preview"
              style={{ width: defaultWidth, height: defaultHeight }}
            />
          </div>
        </div>
      );
    case "video":
      return isLiveMode ? (
        <div className="w-full h-full flex items-center justify-center">
          <ReactPlayer
            url={content.src}
            width={defaultWidth}
            height={defaultHeight}
            className="max-w-full max-h-full"

          />
        </div>
      ) : (
        <div className="bg-muted rounded-lg p-2 w-full h-full flex items-center justify-center">
          <div className="text-center">
            <div className="mb-2 text-sm text-muted-foreground">
              Video will be here
            </div>
            <ReactPlayer
              url={content.src}
              width={defaultWidth}
              height={defaultHeight}
              className="max-w-full max-h-full"
            />
          </div>
        </div>
      );
    default:
      return (
        <div className="w-full h-full flex items-center justify-center p-4 bg-muted rounded-lg">
          <p className="text-lg">{content.innerText || "{{text}}"}</p>
        </div>
      );
  }
};

const DynamicCarouselComponent = (props: Props) => {
  const { dispatch, state } = useEditor();
  const { api } = useKeyboardNavigation();
  // Local state to track if settings panel is visible for this specific element
  const [showSettings, setShowSettings] = useState(false);
  // Refs to detect clicks outside
  const componentRef = useRef<HTMLDivElement>(null);

  // Handle clicks outside the component to maintain selection
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Only handle this logic if settings are showing
      if (!showSettings) return;
      
      // Check if the click was outside our component
      if (componentRef.current && !componentRef.current.contains(event.target as Node)) {
        // Close settings when clicking outside the entire component
        setShowSettings(false);
      }
    };

    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);
    
    // Clean up
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettings]);

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

  const handleDeleteElement = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({
      type: "DELETE_ELEMENT",
      payload: { elementDetails: props.element },
    });
  };

  const handleToggleSettings = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the click from bubbling
    
    // First select the element
    dispatch({
      type: "CHANGE_CLICKED_ELEMENT",
      payload: {
        elementDetails: props.element,
      },
    });
    
    // Toggle settings visibility
    setShowSettings(prev => !prev);
  };

  // Handle clicks on the property panel to prevent closing
  const handlePropertyPanelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Ensure element stays selected
    dispatch({
      type: "CHANGE_CLICKED_ELEMENT",
      payload: {
        elementDetails: props.element,
      },
    });
  };

  const isSelected = state.editor.selectedElement.id === props.element.id;
  const isLiveMode = state.editor.liveMode;
  const content = !Array.isArray(props.element.content)
    ? props.element.content
    : {};
  const slides = content.slides || [
    {
      type: "text",
      innerText: "{{text}}",
    },
  ];
  const autoSlide = content.autoSlide;
  const slideInterval = content.slideInterval || 5000;

  const [currentIndex, setCurrentIndex] = useState(
    content.currentSlideIndex || 0
  );

  useEffect(() => {
    setCurrentIndex(content.currentSlideIndex || 0);
  }, [content.currentSlideIndex]);

  useEffect(() => {
    if (api) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (!content.keyboardNav) return;

        if (e.key === "ArrowLeft") {
          api.scrollPrev();
          setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
        } else if (e.key === "ArrowRight") {
          api.scrollNext();
          setCurrentIndex((prev) => (prev + 1) % slides.length);
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [api, content.keyboardNav, slides.length]);

  // Handle auto-slide
  useEffect(() => {
    if (autoSlide && api) {
      const interval = setInterval(() => {
        api.scrollNext();
        setCurrentIndex((prev) => (prev + 1) % slides.length);
      }, slideInterval);

      return () => clearInterval(interval);
    }
  }, [autoSlide, slideInterval, api, slides.length]);

  return (
    <div
      ref={componentRef}
      style={{
        ...props.element.styles,
      }}
      draggable
      onDragStart={(e) => handleDragStart(e, "dynamicCarousel")}
      onClick={handleOnClickBody}
      className={clsx("w-full m-[5px] relative text-[16px] transition-all", {
        "!border-blue-500": isSelected,
        "!border-solid": isSelected,
        "border-dashed border-[1px] border-slate-300": !isLiveMode,
      })}
    >
      {isSelected && !isLiveMode && (
        <div className="absolute -top-[25px] right-[0px]">
          <div className="bg-primary px-2.5 py-1 text-xs font-bold rounded-t-lg !text-white flex items-center gap-2">
            <Settings
              className={clsx("cursor-pointer hover:text-blue-200", {
                "text-blue-200": showSettings
              })}
              size={16}
              onClick={handleToggleSettings}
            />
            <Trash
              className="cursor-pointer hover:text-red-200"
              size={16}
              onClick={handleDeleteElement}
            />
          </div>
        </div>
      )}

      <Carousel
        opts={{
          align: "start",
          loop: true,
          startIndex: currentIndex,
        }}
        orientation="horizontal"
        className="w-full"
        setApi={(api) => {
          if (api) {
            // Go to the current slide
            api.scrollTo(currentIndex);
          }
        }}
      >
        <CarouselContent className="h-full">
          {slides.map((slide, index) => (
            <CarouselItem
              key={index}
              className={`basis-full h-full ${
                index === currentIndex ? "active" : ""
              }`}
            >
              <div className="p-1 h-full">
                <SlideContent content={slide} isLiveMode={isLiveMode} />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 cursor-pointer"
          onClick={() => {
            const newIndex = (currentIndex - 1 + slides.length) % slides.length;
            setCurrentIndex(newIndex);
            api?.scrollTo(newIndex);
          }}
        />
        <CarouselNext
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 cursor-pointer"
          onClick={() => {
            const newIndex = (currentIndex + 1) % slides.length;
            setCurrentIndex(newIndex);
            api?.scrollTo(newIndex);
          }}
        />
      </Carousel>

      {/* Inline Property Panel */}
      {isSelected && showSettings && !isLiveMode && (
        <div 
          className="absolute left-0 right-0 mt-2 z-50 bg-white border rounded-md shadow-lg"
          onClick={handlePropertyPanelClick}
        >
          <div className="flex items-center justify-between p-3 border-b">
            <h3 className="font-medium">Carousel Settings</h3>
            <button 
              onClick={handleToggleSettings}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <X size={16} />
            </button>
          </div>
          <div className="p-4">
            <PropertyPanel />
          </div>
        </div>
      )}
    </div>
  );
};

export default DynamicCarouselComponent;