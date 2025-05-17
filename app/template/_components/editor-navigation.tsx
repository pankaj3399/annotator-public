'use client';
import { upsertTemplate } from '@/app/actions/template';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useEditor } from '@/providers/editor/editor-provider';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { template } from '../page';

type Props = {
  pageId: string;
  pageDetails: any;
  projectId: string;
};

const EditorNavigation = ({ pageId, pageDetails, projectId }: Props) => {
  const router = useRouter();
  const { state, dispatch } = useEditor();
  const [title, setTitle] = useState(pageDetails.name || 'test2');
  const isPreviewMode = state.editor.previewMode;

  const handlePreviewToggle = () => {
    dispatch({ type: 'TOGGLE_PREVIEW_MODE' });
  };

  const handleOnSave = async () => {
    const content = JSON.stringify(state.editor.elements);
    try {
      await upsertTemplate(
        projectId,
        {
          ...pageDetails,
          name: title,
          content,
        },
        pageId
      );
      toast('Success', { description: 'Test saved successfully' });
    } catch (error) {
      toast('Error', { description: 'Could not save test' });
    }
  };

  return (
    <div className={cn(
      "border-b bg-white transition-all",
      isPreviewMode ? "border-transparent shadow-sm" : "border-gray-200"
    )}>
      {isPreviewMode ? (
        // Preview mode header - simplified
        <div className="py-4 px-6 flex justify-between items-center">
          <div className="flex items-center">
            <Link href={`/projects/${projectId}`} className="mr-3">
              <ArrowLeft className="h-5 w-5 text-gray-500" />
            </Link>
            <h1 className="text-xl font-semibold text-gray-800">Test Preview: {title}</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              className="flex items-center gap-1.5"
              onClick={handlePreviewToggle}
            >
              <EyeOff className="h-4 w-4" />
              Exit Preview
            </Button>
            
            <Button 
              onClick={handleOnSave} 
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Save Test
            </Button>
          </div>
        </div>
      ) : (
        // Edit mode header - full UI
        <div className="py-4 px-6">
          {/* Title and description section */}
          <div className="flex items-start mb-6">
            <Link href={`/projects/${projectId}`} className="mr-3 mt-1">
              <ArrowLeft className="h-5 w-5 text-gray-500" />
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-gray-800">Create Template</h1>
              <p className="text-sm text-gray-500">
                Customize your template form by dragging and dropping elements
              </p>
            </div>
          </div>
          
          {/* Test title and buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Test Title</span>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-64 bg-white border-gray-200"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                className="flex items-center gap-1.5"
                onClick={handlePreviewToggle}
              >
                <Eye className="h-4 w-4" />
                Preview
              </Button>
              
              <Button 
                onClick={handleOnSave} 
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Save Test
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditorNavigation;