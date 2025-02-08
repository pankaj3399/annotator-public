import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SheetMenu } from "@/components/admin-panel/sheet-menu";
import Loader from '@/components/ui/NewLoader/Loader';
import { useToast } from "@/hooks/use-toast";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { getAllAcceptedTasks, getAllTasks } from "@/app/actions/task";
import { format } from "date-fns";

interface TruncatedCellProps {
  content: string;
  maxLength?: number;
}

const TruncatedCell: React.FC<TruncatedCellProps> = ({
  content,
  maxLength = 50,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const shouldTruncate = content.length > maxLength;

  const displayContent = isExpanded
    ? content
    : shouldTruncate
    ? `${content.slice(0, maxLength)}...`
    : content;

  return (
    <div
      onClick={() => shouldTruncate && setIsExpanded(!isExpanded)}
      className={`${shouldTruncate ? "cursor-pointer hover:bg-gray-50" : ""}`}
      title={shouldTruncate && !isExpanded ? content : ""}
    >
      {displayContent}
    </div>
  );
};

interface AnalyticsProps {
  projectId: string;
  projectName: string;
}

interface TaskData {
  _id: string;
  name: string;
  content: string;
  project: string;
  project_Manager: string;
  status: string;
  submitted: boolean;
  timeTaken: number;
  feedback: string;
  timer: number;
  created_at: string;
  annotator: string;
  ai: string | null;
}

interface DynamicField {
  type: string;
  content: string | null;
  name: string;
  wordCount?: number;
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
  dynamicFields: DynamicField[];
}

interface WordCountSummary {
  fieldName: string;
  totalTasks: number;
  totalWordCount: number;
  averageWordCount: number;
}

export default function ProjectAnalytics({
  projectId,
  projectName,
}: AnalyticsProps) {
  const [analyticsData, setAnalyticsData] = useState<ProcessedData[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasDynamicText, setHasDynamicText] = useState(false);
  const { toast } = useToast();
  const { data: session } = useSession();
  const router = useRouter();
  const [wordCountSummaries, setWordCountSummaries] = useState<
    WordCountSummary[]
  >([]);

  const getWordCount = (text: string): number => {
    return text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
  };

  useEffect(() => {
    if (!session || !projectId) return;

    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const res = JSON.parse(await getAllTasks(projectId)) as TaskData[];

        if (res.length === 0) {
          toast({
            variant: "destructive",
            title: "No submitted tasks found",
          });
          setLoading(false);
          return;
        }

        let hasAnyDynamicText = false;
        let fieldWordCounts: { [key: string]: number[] } = {};

        const processedData = res.map((task) => {
          try {
            const contentArray = JSON.parse(task.content);
            const bodyContent = contentArray[0].content;

            let textContent = "";
            const dynamicFields: DynamicField[] = [];

            bodyContent.forEach((item: any) => {
              if (item.type === "text") {
                textContent = item.content.innerText;
              } else if (item.type.startsWith("dynamic")) {
                let content: string | null = null;
                let wordCount: number | undefined;

                if (item.type === "dynamicText") {
                  content = item.content.innerText;
                  wordCount = getWordCount(item.content.innerText);
                  hasAnyDynamicText = true;

                  // Initialize array for this field if it doesn't exist
                  if (!fieldWordCounts[item.name]) {
                    fieldWordCounts[item.name] = [];
                  }
                  if (wordCount) {
                    fieldWordCounts[item.name].push(wordCount);
                  }
                } else if (item.type === "dynamicImage") {
                  content = item.content.src;
                }

                dynamicFields.push({
                  type: item.type,
                  content,
                  name: item.name,
                  wordCount,
                });
              }
            });

            return {
              taskId: task._id,
              taskName: task.name,
              status: task.status,
              timeTaken: task.timeTaken,
              submittedDate: format(
                new Date(task.created_at),
                "MMM dd, yyyy HH:mm"
              ),
              annotator: task.annotator,
              feedback: task.feedback || "No feedback",
              textContent,
              dynamicFields,
            };
          } catch (error) {
            console.error("Error processing task:", error);
            return {
              taskId: task._id,
              taskName: task.name,
              status: task.status,
              timeTaken: task.timeTaken,
              submittedDate: format(
                new Date(task.created_at),
                "MMM dd, yyyy HH:mm"
              ),
              annotator: task.annotator,
              feedback: task.feedback || "No feedback",
              textContent: "Error parsing content",
              dynamicFields: [],
            };
          }
        });

        // Calculate word count summaries
        const summaries: WordCountSummary[] = Object.entries(
          fieldWordCounts
        ).map(([fieldName, counts]) => ({
          fieldName,
          totalTasks: counts.length,
          totalWordCount: counts.reduce((sum, count) => sum + count, 0),
          averageWordCount: Math.round(
            counts.reduce((sum, count) => sum + count, 0) / counts.length
          ),
        }));

        setHasDynamicText(hasAnyDynamicText);
        setWordCountSummaries(summaries);
        setAnalyticsData(processedData);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error loading analytics",
          description:
            error instanceof Error
              ? error.message
              : "An unknown error occurred",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [projectId, session, toast]);

  if (!session) return <Loader />;
  if (loading) return <Loader />;

  const totalTasks = analyticsData.length;
  const avgTimePerTask =
    totalTasks > 0
      ? (
          analyticsData.reduce((acc, curr) => acc + curr.timeTaken*60, 10) /
          totalTasks
        ).toFixed(3)
      : 0;

      return (
        <div className="min-h-screen">
          <header className="bg-white">
            <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
              <SheetMenu />
            </div>
          </header>
    
          <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{totalTasks}</div>
                  <p className="text-sm text-gray-500">Total Tasks</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{avgTimePerTask} seconds</div>
                  <p className="text-sm text-gray-500">Average Time per Task</p>
                </CardContent>
              </Card>
            </div>
    
            {analyticsData.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-10">
                    <h2 className="text-xl font-semibold text-gray-900">No analytics data available</h2>
                    <p className="mt-2 text-gray-600">Wait for tasks to be submitted to see analytics.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Task Submissions Analytics</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-auto" style={{ maxHeight: "70vh" }}>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="p-4 bg-white sticky top-0" style={{ width: "200px" }}>Task Name</TableHead>
                            <TableHead className="p-4 bg-white sticky top-0" style={{ width: "200px" }}>Static Text</TableHead>
                            <TableHead className="p-4 whitespace-nowrap bg-white sticky top-0">Time Taken (seconds)</TableHead>
                            <TableHead className="p-4 whitespace-nowrap bg-white sticky top-0">Submitted Date</TableHead>
                            <TableHead className="p-4 whitespace-nowrap bg-white sticky top-0">Status</TableHead>
                            {analyticsData[0].dynamicFields.map((field, index) => (
                              <React.Fragment key={index}>
                                <TableHead className="p-4 bg-white sticky top-0" style={{ width: "300px" }}>{field.name}</TableHead>
                                {field.type === "dynamicText" && (
                                  <TableHead className="p-4 whitespace-nowrap bg-white sticky top-0">Word Count</TableHead>
                                )}
                              </React.Fragment>
                            ))}
                            <TableHead className="p-4 whitespace-nowrap bg-white sticky top-0">Annotator ID</TableHead>
                            <TableHead className="p-4 bg-white sticky top-0" style={{ width: "200px" }}>Feedback</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {analyticsData.map((row) => (
                            <TableRow key={row.taskId} className="align-top">
                              <TableCell className="p-4 align-top" style={{ width: "200px" }}>
                                <TruncatedCell content={row.taskName} maxLength={30} />
                              </TableCell>
                              <TableCell className="p-4 align-top" style={{ width: "200px" }}>
                                <TruncatedCell content={row.textContent} maxLength={30} />
                              </TableCell>
                              <TableCell className="p-4 align-top whitespace-nowrap">{row.timeTaken}</TableCell>
                              <TableCell className="p-4 align-top whitespace-nowrap">{row.submittedDate}</TableCell>
                              <TableCell className="p-4 align-top whitespace-nowrap">
                                <span
                                  className={`px-2 py-1 rounded-full text-sm ${
                                    row.status === "accepted"
                                      ? "bg-green-100 text-green-800"
                                      : row.status === "rejected"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-gray-100 text-gray-800"
                                  }`}
                                >
                                  {row.status}
                                </span>
                              </TableCell>
                              {row.dynamicFields.map((field, index) => (
                                <React.Fragment key={index}>
                                  <TableCell className="p-4 align-top" style={{ width: "300px" }}>
                                    <TruncatedCell content={field.content || "-"} maxLength={50} />
                                  </TableCell>
                                  {field.type === "dynamicText" && (
                                    <TableCell className="p-4 align-top text-center whitespace-nowrap">
                                      {field.wordCount}
                                    </TableCell>
                                  )}
                                </React.Fragment>
                              ))}
                              <TableCell className="font-mono text-sm p-4 align-top whitespace-nowrap">{row.annotator}</TableCell>
                              <TableCell className="p-4 align-top" style={{ width: "200px" }}>
                                <TruncatedCell content={row.feedback} maxLength={30} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
    
                {/* Word Count Summary Table */}
                {hasDynamicText && wordCountSummaries.length > 0 && (
                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle>Word Count Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="p-4 bg-white">Field Name</TableHead>
                              <TableHead className="p-4 bg-white text-right">Total Tasks</TableHead>
                              <TableHead className="p-4 bg-white text-right">Total Word Count</TableHead>
                              <TableHead className="p-4 bg-white text-right">Average Word Count</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {wordCountSummaries.map((summary) => (
                              <TableRow key={summary.fieldName}>
                                <TableCell className="p-4 font-medium">{summary.fieldName}</TableCell>
                                <TableCell className="p-4 text-right">{summary.totalTasks.toLocaleString()}</TableCell>
                                <TableCell className="p-4 text-right">{summary.totalWordCount.toLocaleString()}</TableCell>
                                <TableCell className="p-4 text-right">{summary.averageWordCount.toLocaleString()}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </main>
        </div>
      );
}
