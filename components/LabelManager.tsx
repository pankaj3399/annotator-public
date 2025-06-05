'use client';

import React, { useState, useEffect } from 'react';
import { Tag, X } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { fetchAllLabelsFromLabelsModel } from '@/app/actions/label';
import { Project } from '@/app/(maneger)/page'; // Make sure this path is correct

interface ProjectLabelManagerProps {
  projectId: string;
  project: Project;
  setProject: React.Dispatch<React.SetStateAction<Project | undefined>>;
}

const getLabelStyle = (label: string) => {
  // Generate consistent color for all labels based on label name
  const colors = [
    'bg-blue-200 text-blue-800',
    'bg-green-200 text-green-800',
    'bg-purple-200 text-purple-800',
    'bg-red-200 text-red-800',
    'bg-indigo-200 text-indigo-800',
    'bg-teal-200 text-teal-800',
    'bg-pink-200 text-pink-800',
    'bg-orange-200 text-orange-800',
    'bg-yellow-200 text-yellow-800',
    'bg-cyan-200 text-cyan-800',
    'bg-emerald-200 text-emerald-800',
    'bg-violet-200 text-violet-800',
  ];

  // Generate a hash from the label name for consistent coloring
  const hash = label.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);

  return colors[Math.abs(hash) % colors.length];
};

const ProjectLabelManager = ({
  projectId,
  project,
  setProject,
}: ProjectLabelManagerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [availableLabels, setAvailableLabels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch all labels from the Labels model
  useEffect(() => {
    const fetchLabels = async () => {
      try {
        setIsLoading(true);
        const labels = await fetchAllLabelsFromLabelsModel();
        setAvailableLabels(labels);
      } catch (error) {
        console.error('Error fetching labels:', error);
        toast.error('Failed to load available labels');
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      fetchLabels();
    }
  }, [isOpen]);

  const handleLabelSelect = async (label: string) => {
    if (project.labels?.includes(label)) {
      toast.info('Label already added to this project');
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
      setIsOpen(false); // Close popover after adding
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

  // Filter out labels that are already assigned to the project
  const unassignedLabels = availableLabels.filter(
    (label) => !project.labels?.includes(label)
  );

  return (
    <div className='flex items-center gap-2'>
      <div className='flex flex-wrap gap-2'>
        {project?.labels?.map((label: string) => {
          const labelStyle = getLabelStyle(label);

          return (
            <div
              key={label}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${labelStyle} transition-all duration-200 hover:scale-105`}
            >
              {label}
              <span
                onClick={(e) => handleLabelRemove(label, e)}
                className='ml-1 hover:bg-black/20 rounded-full p-0.5 cursor-pointer transition-colors duration-200'
                title={`Remove ${label} label`}
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
            className='h-8 w-8 hover:bg-slate-800 transition-colors duration-200'
            title='Add label'
          >
            <Tag className='h-4 w-4' />
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-60 p-2' side='bottom' align='start'>
          <div className='flex flex-col gap-1 max-h-64 overflow-y-auto'>
            {isLoading ? (
              <div className='flex items-center justify-center py-4'>
                <div className='text-sm text-gray-500'>Loading labels...</div>
              </div>
            ) : unassignedLabels.length > 0 ? (
              unassignedLabels.map((label) => (
                <button
                  key={label}
                  className={`text-left px-3 py-2 text-sm rounded font-medium transition-all duration-200 hover:scale-105 ${getLabelStyle(label)}`}
                  onClick={() => handleLabelSelect(label)}
                >
                  {label}
                </button>
              ))
            ) : (
              <div className='text-sm text-gray-500 py-4 text-center'>
                {availableLabels.length === 0
                  ? 'No labels available. Create labels first.'
                  : 'All available labels are already assigned to this project.'}
              </div>
            )}
          </div>

          {unassignedLabels.length > 0 && (
            <div className='border-t mt-2 pt-2'>
              <div className='text-xs text-gray-500 text-center'>
                {unassignedLabels.length} label
                {unassignedLabels.length !== 1 ? 's' : ''} available
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default ProjectLabelManager;
