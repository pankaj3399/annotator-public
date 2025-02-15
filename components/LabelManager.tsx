// components/ProjectLabelManager.tsx
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
import { Project } from '@/app/(maneger)/page'; // Make sure this path is correct

const labelStyles = {
  'LLM BENCHMARK': 'bg-yellow-200 text-yellow-800',
  MULTIMODALITY: 'bg-orange-200 text-orange-800',
  TRANSLATION: 'bg-cyan-200 text-cyan-800',
  ACCENTS: 'bg-pink-200 text-pink-800',
  ENGLISH: 'bg-indigo-200 text-indigo-800',
};

const predefinedLabels = Object.keys(
  labelStyles
) as (keyof typeof labelStyles)[];

interface ProjectLabelManagerProps {
  projectId: string;
  project: Project;
  setProject: React.Dispatch<React.SetStateAction<Project | undefined>>;
}

const isPredefinedLabel = (
  label: string
): label is keyof typeof labelStyles => {
  return predefinedLabels.includes(label as keyof typeof labelStyles);
};

const ProjectLabelManager = ({
  projectId,
  project,
  setProject,
}: ProjectLabelManagerProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleLabelSelect = async (label: string) => {
    if (project.labels?.includes(label)) {
      return;
    }

    const newLabels = [...(project.labels || []), label];

    try {
      const res = await fetch(`/api/projects/${projectId}/labels`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ labels: newLabels }),
      });

      if (!res.ok) throw new Error('Failed to add label');

      const updatedProject = await res.json();
      setProject((prev: Project | undefined) =>
        prev ? { ...prev, labels: updatedProject.labels } : prev
      );
      toast.success('Label added successfully');
    } catch (error) {
      toast.error('Failed to add label');
      console.error(error);
    }
  };

  const handleLabelRemove = async (
    labelToRemove: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    e.preventDefault();

    const newLabels = (project.labels || []).filter(
      (label) => label !== labelToRemove
    );

    try {
      const res = await fetch(`/api/projects/${projectId}/labels`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ labels: newLabels }),
      });

      if (!res.ok) throw new Error('Failed to remove label');

      const updatedProject = await res.json();
      setProject((prev: Project | undefined) =>
        prev ? { ...prev, labels: updatedProject.labels } : prev
      );
      toast.success('Label removed successfully');
    } catch (error) {
      toast.error('Failed to remove label');
      console.error(error);
    }
  };

  return (
    <div className='flex items-center gap-2'>
      <div className='flex flex-wrap gap-2'>
        {project?.labels?.map((label: string) => {
          const backgroundColor = isPredefinedLabel(label)
            ? labelStyles[label as keyof typeof labelStyles]
            : 'bg-gray-200 text-gray-800';

          return (
            <div
              key={label}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${backgroundColor}`}
            >
              {label}
              <span
                onClick={(e) => handleLabelRemove(label, e)}
                className='ml-1 hover:bg-black/10 rounded-full p-0.5 cursor-pointer'
              >
                <X className='h-3 w-3' />
              </span>
            </div>
          );
        })}
      </div>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant='ghost'
            size='icon'
            className='h-8 w-8 hover:bg-slate-800'
          >
            <Tag className='h-4 w-4' />
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-52 p-2' side='bottom' align='start'>
          <div className='flex flex-col gap-1'>
            {predefinedLabels.map((label) => (
              <button
                key={label}
                className={`text-left px-2 py-1.5 text-sm rounded font-medium ${labelStyles[label]}`}
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

export default ProjectLabelManager;
