"use client";

import { useEditor } from "@/providers/editor/editor-provider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EditorBtns } from "@/lib/constants";

import { Button } from "@/components/ui/button";
import { Plus, Minus } from "lucide-react";

type ElementContent = {
  href?: string;
  innerText?: string;
  src?: string;
  selectedCheckbox?: string[];
  title?: string;
  checkboxes?: string[];
  type?: string;
  limit?: number;
  wordLimit?: number;
  keyboardNav?: boolean;
  autoSlide?: boolean;
  slideInterval?: number;
  slides?: Array<{
    type: string;
    src?: string;
    innerText?: string;
  }>;
  currentSlideIndex?: number;
};

const PropertyPanel = () => {
  const { state, dispatch } = useEditor();
  const element = state.editor.selectedElement;

  const [elementProperties, setElementProperties] = useState({
    id: element.id || "",
    name: element.name || "",
    content: !Array.isArray(element.content) ? element.content : {},
  });

  useEffect(() => {
    setElementProperties({
      id: element.id || "",
      name: element.name || "",
      content: !Array.isArray(element.content) ? element.content : {},
    });
  }, [element]);

  const handlePropertyChange = (property: string, value: any) => {
    setElementProperties((prev) => ({ ...prev, [property]: value }));

    if (property === "name") {
      dispatch({
        type: "UPDATE_ELEMENT",
        payload: {
          elementDetails: {
            ...element,
            [property]: value,
          },
        },
      });
      return;
    }

    if (element.type === "dynamicCarousel") {
      const currentContent = !Array.isArray(element.content)
        ? element.content
        : {};
      const updatedContent = {
        ...currentContent,
        [property]: value,
      };

      dispatch({
        type: "UPDATE_ELEMENT",
        payload: {
          elementDetails: {
            ...element,
            content: updatedContent,
          },
        },
      });
      return;
    }

    dispatch({
      type: "UPDATE_ELEMENT",
      payload: {
        elementDetails: {
          ...element,
          content: Array.isArray(element.content)
            ? element.content
            : {
                ...element.content,
                [property]: value,
              },
        },
      },
    });
  };

  if (!element || !element.id || element.type === "__body") {
    return null;
  }

  const showProperties = () => {
    switch (element.type) {
      case "inputText":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={elementProperties.name}
                onChange={(e) => handlePropertyChange("name", e.target.value)}
                placeholder="Element name"
              />
            </div>

            <div className="space-y-2">
              <Label>Placeholder</Label>
              <Input
                value={
                  !Array.isArray(elementProperties.content)
                    ? elementProperties.content.innerText
                    : ""
                }
                onChange={(e) =>
                  handlePropertyChange("innerText", e.target.value)
                }
                placeholder="Enter placeholder text"
              />
            </div>

            <div className="space-y-2">
              <Label>Word Limit</Label>
              <Input
                type="number"
                value={
                  !Array.isArray(elementProperties.content)
                    ? elementProperties.content.wordLimit
                    : ""
                }
                onChange={(e) =>
                  handlePropertyChange("wordLimit", parseInt(e.target.value))
                }
                placeholder="Enter word limit"
              />
            </div>
            <div className="space-y-2">
  <Label>Allow Paste</Label>
  <div className="flex items-center space-x-2">
    <input
      type="checkbox"
      checked={
        !Array.isArray(elementProperties.content)
          ? elementProperties.content.copyAllowed
          : false
      }
      onChange={(e) =>
        handlePropertyChange("copyAllowed", e.target.checked)
      }
      className="toggle-checkbox"
    />
    <span>
      {(!Array.isArray(elementProperties.content) &&
        elementProperties.content.copyAllowed)
        ? "Enabled"
        : "Disabled"}
    </span>
  </div>
</div>

          </div>
        );

      case "text":
      case "dynamicText":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={elementProperties.name}
                onChange={(e) => handlePropertyChange("name", e.target.value)}
                placeholder="Element name"
              />
            </div>

            <div className="space-y-2">
              <Label>Text Content</Label>
              <Input
                value={
                  !Array.isArray(elementProperties.content)
                    ? elementProperties.content.innerText
                    : ""
                }
                onChange={(e) =>
                  handlePropertyChange("innerText", e.target.value)
                }
                placeholder="Enter text content"
              />
            </div>
          </div>
        );

      case "checkbox":
      case "dynamicCheckbox":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={elementProperties.name}
                onChange={(e) => handlePropertyChange("name", e.target.value)}
                placeholder="Element name"
              />
            </div>

            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={
                  !Array.isArray(elementProperties.content)
                    ? elementProperties.content.title
                    : ""
                }
                onChange={(e) => handlePropertyChange("title", e.target.value)}
                placeholder="Enter checkbox title"
              />
            </div>

            <div className="space-y-2">
              <Label>Options (comma-separated)</Label>
              <Input
                value={
                  !Array.isArray(elementProperties.content)
                    ? (elementProperties.content.checkboxes || []).join(", ")
                    : ""
                }
                onChange={(e) =>
                  handlePropertyChange(
                    "checkboxes",
                    e.target.value.split(",").map((s) => s.trim())
                  )
                }
                placeholder="Option 1, Option 2, Option 3"
              />
            </div>
          </div>
        );

      case "video":
      case "dynamicVideo":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={elementProperties.name}
                onChange={(e) => handlePropertyChange("name", e.target.value)}
                placeholder="Element name"
              />
            </div>

            <div className="space-y-2">
              <Label>Video URL</Label>
              <Input
                value={
                  !Array.isArray(elementProperties.content)
                    ? elementProperties.content.src
                    : ""
                }
                onChange={(e) => handlePropertyChange("src", e.target.value)}
                placeholder="Enter video URL"
              />
            </div>

            <div className="space-y-2">
              <Label>Time Limit (seconds)</Label>
              <Input
                type="number"
                value={
                  !Array.isArray(elementProperties.content)
                    ? elementProperties.content.limit
                    : ""
                }
                onChange={(e) =>
                  handlePropertyChange("limit", parseInt(e.target.value))
                }
                placeholder="Enter time limit"
              />
            </div>
          </div>
        );

      case "audio":
      case "dynamicAudio":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={elementProperties.name}
                onChange={(e) => handlePropertyChange("name", e.target.value)}
                placeholder="Element name"
              />
            </div>

            <div className="space-y-2">
              <Label>Audio URL</Label>
              <Input
                value={
                  !Array.isArray(elementProperties.content)
                    ? elementProperties.content.src
                    : ""
                }
                onChange={(e) => handlePropertyChange("src", e.target.value)}
                placeholder="Enter audio URL"
              />
            </div>

            <div className="space-y-2">
              <Label>Time Limit (seconds)</Label>
              <Input
                type="number"
                value={
                  !Array.isArray(elementProperties.content)
                    ? elementProperties.content.limit
                    : ""
                }
                onChange={(e) =>
                  handlePropertyChange("limit", parseInt(e.target.value))
                }
                placeholder="Enter time limit"
              />
            </div>
          </div>
        );

      case "image":
      case "dynamicImage":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={elementProperties.name}
                onChange={(e) => handlePropertyChange("name", e.target.value)}
                placeholder="Element name"
              />
            </div>

            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input
                value={
                  !Array.isArray(elementProperties.content)
                    ? elementProperties.content.src
                    : ""
                }
                onChange={(e) => handlePropertyChange("src", e.target.value)}
                placeholder="Enter image URL"
              />
            </div>
          </div>
        );

      case "recordVideo":
      case "inputRecordVideo":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={elementProperties.name}
                onChange={(e) => handlePropertyChange("name", e.target.value)}
                placeholder="Element name"
              />
            </div>

            <div className="space-y-2">
              <Label>Time Limit (seconds)</Label>
              <Input
                type="number"
                value={
                  !Array.isArray(elementProperties.content)
                    ? elementProperties.content.limit
                    : ""
                }
                onChange={(e) =>
                  handlePropertyChange("limit", parseInt(e.target.value))
                }
                placeholder="Enter time limit"
              />
            </div>
          </div>
        );

      case "recordAudio":
      case "inputRecordAudio":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={elementProperties.name}
                onChange={(e) => handlePropertyChange("name", e.target.value)}
                placeholder="Element name"
              />
            </div>

            <div className="space-y-2">
              <Label>Time Limit (seconds)</Label>
              <Input
                type="number"
                value={
                  !Array.isArray(elementProperties.content)
                    ? elementProperties.content.limit
                    : ""
                }
                onChange={(e) =>
                  handlePropertyChange("limit", parseInt(e.target.value))
                }
                placeholder="Enter time limit"
              />
            </div>
          </div>
        );

      case "dynamicCarousel": {
        const content = !Array.isArray(elementProperties.content)
          ? (elementProperties.content as ElementContent)
          : ({} as ElementContent);

        // Initialize slides if they don't exist
        if (!content.slides || content.slides.length === 0) {
          content.slides = [
            {
              type: "text",
              innerText: "{{text}}",
            },
          ];
          content.currentSlideIndex = 0;

          // Update the element with initial slides
          handlePropertyChange("slides", content.slides);
          handlePropertyChange("currentSlideIndex", 0);
        }

        const currentSlideIndex = content.currentSlideIndex || 0;
        const slides = content.slides || [
          {
            type: "text",
            innerText: "{{text}}",
          },
        ];
        const currentSlide = slides[currentSlideIndex] || slides[0];

        const handleAddSlide = () => {
          const newSlides = [
            ...(content.slides || []),
            {
              type: "text",
              innerText: "{{text}}",
            },
          ];
          // Dispatch update with new slides and set current index to the new slide
          dispatch({
            type: "UPDATE_ELEMENT",
            payload: {
              elementDetails: {
                ...element,
                content: {
                  ...content,
                  slides: newSlides,
                  currentSlideIndex: newSlides.length - 1,
                },
              },
            },
          });
        };

        const handleRemoveSlide = (index: number) => {
          if ((content.slides?.length || 0) <= 1) return; // Keep at least one slide

          const newSlides = slides.filter((_, i) => i !== index);
          const newCurrentIndex =
            index >= newSlides.length
              ? newSlides.length - 1
              : content.currentSlideIndex || 0;

          // Dispatch update with removed slide and adjusted current index
          dispatch({
            type: "UPDATE_ELEMENT",
            payload: {
              elementDetails: {
                ...element,
                content: {
                  ...content,
                  slides: newSlides,
                  currentSlideIndex: newCurrentIndex,
                },
              },
            },
          });
        };

        const handleSlideChange = (index: number) => {
          handlePropertyChange("currentSlideIndex", index);
        };

        const updateCurrentSlide = (property: string, value: any) => {
          const newSlides = [...slides];
          newSlides[currentSlideIndex] = {
            ...newSlides[currentSlideIndex],
            [property]: value,
          };
          handlePropertyChange("slides", newSlides);
        };

        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={elementProperties.name}
                onChange={(e) => handlePropertyChange("name", e.target.value)}
                placeholder="Element name"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Slides</Label>
                <Button variant="outline" size="sm" onClick={handleAddSlide}>
                  <Plus className="h-4 w-4" />
                  Add Slide
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {slides.map((slide, index) => (
                  <Button
                    key={index}
                    variant={
                      index === currentSlideIndex ? "default" : "outline"
                    }
                    size="sm"
                    className="relative"
                    onClick={() =>
                      dispatch({
                        type: "UPDATE_ELEMENT",
                        payload: {
                          elementDetails: {
                            ...element,
                            content: {
                              ...content,
                              currentSlideIndex: index,
                            },
                          },
                        },
                      })
                    }
                  >
                    Slide {index + 1}
                    {slides.length > 1 && (
                      <button
                        className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveSlide(index);
                        }}
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                    )}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Content Type</Label>
              <Select
                value={currentSlide?.type || "text"}
                onValueChange={(value) => updateCurrentSlide("type", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select content type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {currentSlide?.type &&
              (currentSlide.type === "image" ||
                currentSlide.type === "video") && (
                <div className="space-y-2">
                  <Label>
                    {currentSlide.type === "image" ? "Image URL" : "Video URL"}
                  </Label>
                  <Input
                    value={currentSlide.src || ""}
                    onChange={(e) => updateCurrentSlide("src", e.target.value)}
                    placeholder={`Enter ${currentSlide.type?.toLowerCase()} URL`}
                  />
                </div>
              )}

            {currentSlide?.type === "text" && (
              <div className="space-y-2">
                <Label>Text Content</Label>
                <Input
                  value={currentSlide.innerText || ""}
                  onChange={(e) =>
                    updateCurrentSlide("innerText", e.target.value)
                  }
                  placeholder="Enter text content"
                />
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Switch
                id="keyboard-nav"
                checked={!!content.keyboardNav}
                onCheckedChange={(checked) =>
                  handlePropertyChange("keyboardNav", checked)
                }
              />
              <Label htmlFor="keyboard-nav">Enable Keyboard Navigation</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="auto-slide"
                checked={!!content.autoSlide}
                onCheckedChange={(checked) =>
                  handlePropertyChange("autoSlide", checked)
                }
              />
              <Label htmlFor="auto-slide">Enable Auto Slide</Label>
            </div>

            {content.autoSlide && (
              <div className="space-y-2">
                <Label>Slide Interval (seconds)</Label>
                <Input
                  type="number"
                  value={content.slideInterval || 5}
                  onChange={(e) =>
                    handlePropertyChange(
                      "slideInterval",
                      parseInt(e.target.value)
                    )
                  }
                  placeholder="Enter slide interval"
                  min={1}
                />
              </div>
            )}
          </div>
        );
      }
      default:
        return (
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={elementProperties.name}
              onChange={(e) => handlePropertyChange("name", e.target.value)}
              placeholder="Element name"
            />
          </div>
        );
    }
  };

  return (
    <div className="p-4 space-y-4 bg-background rounded-lg border">
      <div className="font-medium flex items-center gap-2">
        <span className="bg-primary/5 p-2 rounded-md">{element.name}</span>
      </div>
      {showProperties()}
    </div>
  );
};

export default PropertyPanel;
