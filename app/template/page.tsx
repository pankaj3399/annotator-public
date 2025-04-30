'use client';
import Loader from '@/components/ui/NewLoader/Loader';
import { toast } from '@/hooks/use-toast';
import EditorProvider, { useEditor } from '@/providers/editor/editor-provider';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getTemplate } from '../actions/template';
import Editor from './_components/editor';
import EditorNavigation from './_components/editor-navigation';
import EditorSidebar from './_components/editor-sidebar';
import { Sidebar } from '@/components/admin-panel/sidebar';
import { useStore } from '@/hooks/use-store';
import { useSidebarToggle } from '@/hooks/use-sidebar-toggle';
import { cn } from '@/lib/utils';

export type template = {
  _id: string;
  name: string;
  project: string;
  content: string;
  created_at: string;
  timer: number;
  type: string;
  private: boolean;
  groundTruthTask: string;
};

const Page = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const templateId = searchParams.get('Id');
  const [template, setTemplate] = useState<template>();
  const [loading, setLoading] = useState(true);
  // Get sidebar state from your existing hook
  const sidebar = useStore(useSidebarToggle, (state) => state);

  useEffect(() => {
    if (templateId == null) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Invalid project',
      });
      router.back();
      return;
    }
    const fetchData = async () => {
      try {
        const template: template = JSON.parse(await getTemplate(templateId));
        setTemplate(template);
        setLoading(false);
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message,
        });
        router.back();
      }
    };
    fetchData();
  }, [templateId, router]);

  if (loading) return <Loader />;
  if (!template || !sidebar) {
    toast({
      variant: 'destructive',
      title: 'Error',
      description: 'Something went wrong',
    });
    router.back();
    return null;
  }

  return (
    <>
      {/* Your existing admin sidebar */}
      <Sidebar />
      
      {/* Main content area that sits next to the admin sidebar */}
      <main className={cn(
        "h-screen transition-all duration-300",
      )}>
        <EditorProvider
          subaccountId={template.project}
          funnelId={template._id}
          pageDetails={template}
        >
          <div className="flex flex-col h-full">
            {/* Navigation - conditionally styled/shown based on preview mode */}
            <EditorNavigation
              pageId={templateId as string}
              pageDetails={template}
              projectId={template.project}
            />
            
            {/* Main content area with conditional layout based on preview mode */}
            <div className="flex flex-1 overflow-hidden">
              {/* Custom markup to conditionally show/hide the sidebar based on preview mode */}
              <EditorSidebarWithPreview projectId={template.project} />
              
              {/* Canvas - takes up remaining space */}
              <div className="flex-1 overflow-y-auto">
                <Editor pageId={template._id} />
              </div>
            </div>
          </div>
        </EditorProvider>
      </main>
    </>
  );
};

// Helper component to handle preview mode logic
const EditorSidebarWithPreview = ({ projectId }: { projectId: string }) => {
  const { state } = useEditor();
  
  if (state.editor.previewMode) {
    return null;
  }
  
  return (
    <div className="w-[250px] border-r overflow-y-auto">
      <EditorSidebar projectId={projectId} />
    </div>
  );
};

export default Page;