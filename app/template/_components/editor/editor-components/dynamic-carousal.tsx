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
import { useEffect, useState } from "react";
import { Trash } from "lucide-react";
import clsx from "clsx";
import ReactPlayer from "react-player";
import { useKeyboardNavigation } from "./use-keyboard-navigation";

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
  const defaultWidth = "560px";
  const defaultHeight = "315px";

  switch (content.type) {
    case "image":
      return isLiveMode ? (
        <img
          src={content.src}
          alt="Carousel image"
          className="w-full h-full object-contain"
          style={{ width: defaultWidth, height: defaultHeight }}
        />
      ) : (
        <div className="bg-muted rounded-lg p-2">
          <div className="mb-2 text-sm text-muted-foreground">
            Image will be here
          </div>
            <img
            src={content.src || "/api/placeholder/400/320"}
            alt="Preview"
            className="w-full h-full object-contain"
            style={{ width: defaultWidth, height: defaultHeight }}
            />
          </div>
          );
        case "video":
          return isLiveMode ? (
          <ReactPlayer
            url={content.src}
            width={defaultWidth}
            height={defaultHeight}
            className="w-full h-full object-contain"
          />
          ) : (
          <div className="bg-muted rounded-lg p-2">
            <div className="mb-2 text-sm text-muted-foreground">
            Video will be here
            </div>
            <ReactPlayer
            url={content.src}
            width={defaultWidth}
            height={defaultHeight}
            className="w-full h-full object-contain"
            />
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
      style={{
        ...props.element.styles,
        padding: "80px",
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
          <div className="bg-primary px-2.5 py-1 text-xs font-bold rounded-none rounded-t-lg !text-white">
            <Trash
              className="cursor-pointer"
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
        <CarouselContent>
          {slides.map((slide, index) => (
            <CarouselItem
              key={index}
              className={`basis-full ${index === currentIndex ? "active" : ""}`}
            >
              <div className="p-1">
                <SlideContent content={slide} isLiveMode={isLiveMode} />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious
          onClick={() => {
            const newIndex = (currentIndex - 1 + slides.length) % slides.length;
            setCurrentIndex(newIndex);
            api?.scrollTo(newIndex);
          }}
        />
        <CarouselNext
          onClick={() => {
            const newIndex = (currentIndex + 1) % slides.length;
            setCurrentIndex(newIndex);
            api?.scrollTo(newIndex);
          }}
        />
      </Carousel>
    </div>
  );
};

export default DynamicCarouselComponent;
