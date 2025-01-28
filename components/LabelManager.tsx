'use client';

import React, { useState } from 'react';
import { Tag, X } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { upsertTemplate } from '@/app/actions/template';
import { template } from '@/app/template/page';

// Define label type
type LabelType = 'LLM BENCHMARK' | 'MULTIMODALITY' | 'TRANSLATION' | 'ACCENTS' | 'ENGLISH';

// Define label colors
const labelStyles: Record<LabelType, string> = {
  'LLM BENCHMARK': 'bg-yellow-200 text-yellow-800',
  'MULTIMODALITY': 'bg-orange-200 text-orange-800',
  'TRANSLATION': 'bg-cyan-200 text-cyan-800',
  'ACCENTS': 'bg-pink-200 text-pink-800',
  'ENGLISH': 'bg-gray-200 text-gray-800'
};

const predefinedLabels = Object.keys(labelStyles) as LabelType[];

interface LabelManagerProps {
  pageDetails: template;
  projectId: string;
  pageId: string;
}

const LabelManager = ({ pageDetails, projectId, pageId }: LabelManagerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLabels, setSelectedLabels] = useState<LabelType[]>(() => {
    return (pageDetails?.labels || []) as LabelType[];
  });

  const handleLabelSelect = (label: LabelType) => {
    if (selectedLabels.includes(label)) {
      setIsOpen(false);
      return;
    }

    const newLabels = [...selectedLabels, label];
    
    upsertTemplate(
      projectId,
      {
        ...pageDetails,
        labels: newLabels,
      },
      pageId
    )
      .then(() => {
        setSelectedLabels(newLabels);
        toast('Success', { description: 'Label added successfully' });
      })
      .catch(() => {
        toast('Error', { description: 'Failed to add label' });
      });
    
    setIsOpen(false);
  };

  const handleLabelRemove = (labelToRemove: LabelType, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    const newLabels = selectedLabels.filter(label => label !== labelToRemove);
    
    upsertTemplate(
      projectId,
      {
        ...pageDetails,
        labels: newLabels,
      },
      pageId
    )
      .then(() => {
        setSelectedLabels(newLabels);
        toast('Success', { description: 'Label removed successfully' });
      })
      .catch(() => {
        toast('Error', { description: 'Failed to remove label' });
      });
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-wrap gap-2">
        {selectedLabels.map((label) => (
          <div
            key={label}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${labelStyles[label]}`}
          >
            {label}
            <span
              onClick={(e) => handleLabelRemove(label, e)}
              className="ml-1 hover:bg-black/10 rounded-full p-0.5 cursor-pointer"
            >
              <X className="h-3 w-3" />
            </span>
          </div>
        ))}
      </div>
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon"
            className="h-8 w-8 hover:bg-slate-800"
          >
            <Tag className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-52 p-2" side="bottom" align="start">
          <div className="flex flex-col gap-1">
            {predefinedLabels.map((label) => (
              <button
                key={label}
                className={`text-left px-2 py-1.5 text-sm rounded font-medium ${labelStyles[label]} hover:opacity-80 transition-opacity`}
                onClick={() => handleLabelSelect(label)}
              >
                {label}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default LabelManager;