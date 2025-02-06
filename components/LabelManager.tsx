'use client';

import React, { useState, useEffect } from 'react';
import { Tag, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { upsertTemplate } from '@/app/actions/template';
import { template } from '@/app/template/page';
import { getLabels } from '@/app/actions/label';

// Define label colors for predefined labels (Tailwind classes)
const labelStyles = {
  'LLM BENCHMARK': 'bg-yellow-200 text-yellow-800',
  MULTIMODALITY: 'bg-orange-200 text-orange-800',
  TRANSLATION: 'bg-cyan-200 text-cyan-800',
  ACCENTS: 'bg-pink-200 text-pink-800',
  ENGLISH: 'bg-indigo-200 text-indigo-800',
};

const predefinedLabels = Object.keys(labelStyles) as (keyof typeof labelStyles)[];

interface LabelManagerProps {
  pageDetails: template;
  projectId: string;
  pageId: string;
  selectedLabels: string[];
  setSelectedLabels: (selectedLabels: string[]) => void;
}

interface CustomLabel {
  _id: string;
  name: string;
}

// Type guard to check if the label is a predefined label
const isPredefinedLabel = (label: string): label is keyof typeof labelStyles => {
  return predefinedLabels.includes(label as keyof typeof labelStyles);
};

const LabelManager = ({
  pageDetails,
  projectId,
  pageId,
  selectedLabels,
  setSelectedLabels,
}: LabelManagerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customLabels, setCustomLabels] = useState<CustomLabel[]>([]); // State for custom labels

  useEffect(() => {
    // Fetch custom labels when the component mounts
    const fetchLabels = async () => {
      try {
        const parsedLabel = await getLabels();
        setCustomLabels(parsedLabel); // Update state with custom labels
      } catch (error) {
        toast.error('Failed to fetch custom labels');
        console.error(error);
      }
    };
    fetchLabels();
  }, []);

  const handleLabelSelect = async (label: CustomLabel | string) => {
    const labelName = typeof label === 'string' ? label : label.name;

    if (selectedLabels.includes(labelName)) {
      return;
    }

    const newLabels = [...selectedLabels, labelName];

    try {
      await upsertTemplate(projectId, { ...pageDetails, labels: newLabels }, pageId);
      setSelectedLabels(newLabels);
      toast.success('Label added successfully');
    } catch (error) {
      toast.error('Failed to add label');
      console.error(error);
    }
  };

  const handleLabelRemove = async (labelToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const newLabels = selectedLabels.filter((label) => label !== labelToRemove);

    try {
      await upsertTemplate(projectId, { ...pageDetails, labels: newLabels }, pageId);
      setSelectedLabels(newLabels);
      toast.success('Label removed successfully');
    } catch (error)      {
      toast.error('Failed to remove label');
      console.error(error);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-wrap gap-2">
        {selectedLabels.map((label) => {
          const customLabel = customLabels.find((l) => l.name === label);
          const backgroundColor = isPredefinedLabel(label)
            ? labelStyles[label as keyof typeof labelStyles] // Use Tailwind classes for predefined labels
            : 'bg-gray-200 text-gray-800'; // Default color for custom labels

          return (
            <div
              key={label}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${backgroundColor}`}
            >
              {label}
              <span
                onClick={(e) => handleLabelRemove(label, e)}
                className="ml-1 hover:bg-black/10 rounded-full p-0.5 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </span>
            </div>
          );
        })}
      </div>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-800">
            <Tag className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-52 p-2" side="bottom" align="start">
          <div className="flex flex-col gap-1">
            {/* Map over predefined labels and custom labels */}
            {[...predefinedLabels, ...customLabels.map((label) => label.name)].map((label) => {
              const isPredefined = isPredefinedLabel(label);
              const backgroundColor = isPredefined
                ? labelStyles[label as keyof typeof labelStyles] // Use Tailwind classes for predefined labels
                : 'bg-gray-200 text-gray-800'; // Default color for custom labels

              return (
                <button
                  key={label}
                  className={`text-left px-2 py-1.5 text-sm rounded font-medium ${backgroundColor}`}
                  onClick={() => handleLabelSelect(label)}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default LabelManager;
