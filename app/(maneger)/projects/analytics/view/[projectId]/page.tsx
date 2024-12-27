'use client'
// app/(manager)/projects/analytics/view/[projectId]/page.tsx

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Loader from '@/components/ui/Loader/Loader';
import ProjectAnalytics from '@/components/ProjectAnalytics';
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { Table, TableHeader,TableRow,TableHead,TableBody,TableCell } from '@/components/ui/table';
import { getAllTasks } from "@/app/actions/task";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { response } from 'express';

interface ProjectResponse {
  success: boolean;
  project: {
    name: string;
    _id: string;
  };
}

interface ProcessedData {
  taskId: string;
  taskName: string;
  status: string;
  timeTaken: number;
  submittedDate: string;
  annotator: string;
  feedback: string;
  textContent: string;
  dynamicFields: {
    type: string;
    content: string | null;
    name: string;
    wordCount?: number;
  }[];
}

interface WordCountSummary {
  fieldName: string;
  totalTasks: number;
  totalWordCount: number;
  averageWordCount: number;
}
interface Leaderboard {
  annotator: {
    _id: string;
    name: string;
    email: string;
  };
  totalPoints: number;
  _id: string;
}


export default function AnalyticsPage() {
  const params = useParams();
  const [projectName, setProjectName] = useState('');
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const { toast } = useToast();
  const [isLeaderboardOpen,setIsLeaderboardOpen]=useState(false)
  const [leaderboard,setLeaderboard]=useState<Leaderboard[]>()
  const [loadingLeaderboard,setLoadingLeaderboard]=useState(false)
  const { data: session } = useSession();
  const router = useRouter();

  const projectId = typeof params.projectId === 'string' 
    ? params.projectId 
    : Array.isArray(params.projectId) 
      ? params.projectId[0] 
      : '';

  useEffect(() => {
    if (!session) return;
    
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
    fetchLeaderboard();
  }, [projectId, toast, session, router]);

  const openLeaderboard = () => {
    setIsLeaderboardOpen(true);
    fetchLeaderboard();
  };
  const fetchLeaderboard = async () => {
    try {
      setLoadingLeaderboard(true);
      const response = await fetch(`/api/projects/${projectId}/leaderboard`);
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }
      const data = await response.json();
      setLeaderboard(data.leaderboard);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error loading leaderboard",
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    } finally {
      setLoadingLeaderboard(false);
    }
  };
  const handleExport = async (format: string) => {
    try {
      const rawData = JSON.parse(await getAllTasks(projectId));
      if (!rawData || rawData.length === 0) {
        toast({
          variant: "destructive",
          title: "No data to export",
          description: "There are no tasks available for export.",
        });
        return;
      }

      const processedData = rawData.map((task: any) => {
        try {
          const contentArray = JSON.parse(task.content);
          const bodyContent = contentArray[0].content;
          let textContent = "";
          const dynamicFields: any[] = [];

          bodyContent.forEach((item: any) => {
            if (item.type === "text") {
              textContent = item.content.innerText;
            } else if (item.type.startsWith("dynamic")) {
              dynamicFields.push({
                fieldName: item.name,
                fieldType: item.type,
                content: item.type === "dynamicText" ? item.content.innerText : 
                        item.type === "dynamicImage" ? item.content.src : null,
                wordCount: item.type === "dynamicText" ? 
                          item.content.innerText.trim().split(/\s+/).filter((word: string) => word.length > 0).length : 
                          null
              });
            }
          });

          return {
            taskId: task._id,
            taskName: task.name,
            status: task.status,
            timeTaken: task.timeTaken,
            submittedDate: task.created_at,
            annotator: task.annotator,
            feedback: task.feedback || "No feedback",
            staticText: textContent,
            ...dynamicFields.reduce((acc, field) => ({
              ...acc,
              [`${field.fieldName}_content`]: field.content,
              ...(field.wordCount !== null ? { [`${field.fieldName}_wordCount`]: field.wordCount } : {})
            }), {})
          };
        } catch (error) {
          console.error("Error processing task:", error);
          return null;
        }
      }).filter(Boolean);

      if (format === 'json') {
        const dataStr = JSON.stringify(processedData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const exportFileDefaultName = `${projectName}_analytics.json`;
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
      } else {
        if (processedData.length === 0) {
          throw new Error('No valid data to export');
        }

        const headers = Object.keys(processedData[0]);
        const csvContent: string = [
          headers.join(','),
          ...processedData.map((row: Record<string, any>) => 
            headers.map((header: string) => {
              const value: string = row[header]?.toString().replace(/"/g, '""') ?? '';
              return `"${value}"`;
            }).join(',')
          )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `${projectName}_analytics.csv`);
        link.click();
      }

      setIsExportDialogOpen(false);
      toast({
        title: "Export successful",
        description: `Analytics data has been exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        variant: "destructive",
        title: "Error exporting data",
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    }
  };

  console.log(leaderboard)
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
    <div>
      <header className="bg-white">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Project Analytics</h1>
            <p className="mt-1 text-sm text-gray-500">{projectName}</p>
          </div>
          <div className="flex gap-4 items-center">
            <Button
            variant='outline'
            size='sm'
            onClick={openLeaderboard}
            >
              Leaderboard
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExportDialogOpen(true)}
            >
              <FileDown className="h-4 w-4 mr-2" />
              Export Analytics
            </Button>
          </div>
        </div>
      </header>

      <ProjectAnalytics 
        projectId={projectId}
        projectName={projectName}
      />

      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Analytics Data</DialogTitle>
            <DialogDescription>
              Choose your preferred export format
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleExport('csv')}>
              Export as CSV
            </Button>
            <Button onClick={() => handleExport('json')}>
              Export as JSON
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isLeaderboardOpen} onOpenChange={setIsLeaderboardOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle className="text-xl font-semibold text-center">Leaderboard</DialogTitle>
      <DialogDescription className="text-sm text-gray-500 text-center">
        Top annotators in this project based on points.
      </DialogDescription>
    </DialogHeader>

    {loadingLeaderboard ? (
      <div className="flex justify-center items-center py-6">
        <Loader />
      </div>
    ) : leaderboard && leaderboard.length > 0 ? (
      <div className="overflow-x-auto mt-4">
        <Table className="min-w-full">
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="text-sm font-medium text-gray-700 py-3 px-4 text-left">
                Annotator Name
              </TableHead>
              <TableHead className="text-sm font-medium text-gray-700 py-3 px-4 text-left">
                Total Points
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leaderboard.map((entry, index) => (
              <TableRow
                key={index}
                className={`${
                  index % 2 === 0 ? "bg-white" : "bg-gray-50"
                } hover:bg-gray-100 transition-colors duration-200`}
              >
                <TableCell className="py-3 px-4 text-gray-800">
                  {entry.annotator.name || "Unknown"}
                </TableCell>
                <TableCell className="py-3 px-4 text-gray-800">
                  {entry.totalPoints || 0}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    ) : (
      <div className="text-center text-sm text-gray-500 py-6">
        No leaderboard data available.
      </div>
    )}
  </DialogContent>
</Dialog>


    </div>
  );
}