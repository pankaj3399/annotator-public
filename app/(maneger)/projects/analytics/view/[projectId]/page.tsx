'use client'
// app/(manager)/projects/analytics/view/[projectId]/page.tsx

import ProjectAnalytics from '@/components/ProjectAnalytics';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Loader from '@/components/ui/Loader/Loader';

interface ProjectResponse {
  success: boolean;
  project: {
    name: string;
    _id: string;
  };
}

export default function AnalyticsPage() {
  const params = useParams();
  const [projectName, setProjectName] = useState('');
  const { toast } = useToast();
  const { data: session } = useSession();
  const router = useRouter();

  // Extract and validate projectId
  const projectId = typeof params.projectId === 'string' 
    ? params.projectId 
    : Array.isArray(params.projectId) 
      ? params.projectId[0] 
      : '';

  useEffect(() => {
    if (!session) return;
    
    // Ensure we have a valid projectId
    if (!projectId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No project ID provided",
      });
      router.push('/');
      return;
    }

    const fetchProjectDetails = async () => {
      try {
        const response = await fetch(`/api/projects/details/${projectId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch project details');
        }
        const data: ProjectResponse = await response.json();
        console.log("project details:", data);
        if (data.success) {
          setProjectName(data.project.name);
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error loading project details",
          description: error instanceof Error ? error.message : 'An unknown error occurred',
        });
        router.push('/');
      }
    };

    fetchProjectDetails();
  }, [projectId, toast, session, router]);

  if (!session) {
    return <Loader />;
  }

  if (!projectId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900">Invalid Project ID</h1>
          <p className="mt-2 text-gray-600">Please select a valid project.</p>
        </div>
      </div>
    );
  }

  return (
    <ProjectAnalytics 
      projectId={projectId}
      projectName={projectName}
    />
  );
}