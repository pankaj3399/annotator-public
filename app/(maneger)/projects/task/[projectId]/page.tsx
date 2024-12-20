"use client";

import { addJob } from "@/app/actions/aiModel";
import { getAllAnnotators } from "@/app/actions/annotator";
import { changeAnnotator, deleteTask, getAllTasks, getPaginatedTasks } from "@/app/actions/task";
import { upsertTemplate } from "@/app/actions/template";
import { template } from "@/app/template/page";
import { SheetMenu } from "@/components/admin-panel/sheet-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Loader from "@/components/ui/Loader/Loader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import useJobList from "@/hooks/use-jobList";
import { useToast } from "@/hooks/use-toast";
import { Bot, FileDown, PlusCircle, Shuffle } from "lucide-react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Judge } from "../../ai-config/[projectId]/page";
import { TaskTable } from "./table";
import TaskProgress from "./TaskProgress";
import { format, parseISO } from "date-fns";

export interface Task {
  _id: string;
  name: string;
  project: string;
  content: string;
  created_at: string;
  status: string;
  submitted: boolean;
  annotator?: string;
  reviewer?: string; // Added reviewer field
  timeTaken: number;
  feedback: string;
  ai: string;
}

export interface Annotator {
  _id: string;
  name: string;
  email: string;
  lastLogin: string;
  permission?: string[];
}

export default function Component() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentPage,setCurrentPage]=useState(1);
  const [totalPages,setTotalPages]=useState(0);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [annotators, setAnnotators] = useState<Annotator[]>([]);
  const [judges, setJudges] = useState<Judge[]>([]);
  const [activeTab, setActiveTab] = useState<keyof typeof filteredTasks>("all");
  const [allReviewers, setAllReviewers] = useState<Annotator[]>([]);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const { removeJobByTaskid, setJob } = useJobList();
  const pathName = usePathname();
  const projectId = pathName.split("/")[3];
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();

  const fetchJudges = async () => {
    const res = await fetch(`/api/aiModel?projectId=${projectId}`);
    const judges = await res.json(); 
    if (judges.error) {
      toast({
        variant: "destructive",
        title: "Fetching judges failed",
        description: judges.error,
      });
      return;
    }
    setJudges(judges.models.filter((judge: Judge) => judge.enabled == true));
  };

  useEffect(() => {
    async function init() {
      fetchTask(projectId,1)
      fetchJudges();
    }
    if (session) {
      init();
    }
  }, [projectId, session,activeTab]);
  if (!session) {
    return <Loader />;
  }

  if (session?.user?.role === "annotator") router.push("/tasks");

  async function fetchTask(projectId:string,page:number){
    if (!session?.user) return;
    
    const paginatedResponse = JSON.parse(await 
      getPaginatedTasks(projectId,page,activeTab));
      const projectManager: Annotator = {
        _id: session.user.id,
        name: session.user.name || "Project Manager",
        email: session.user.email || "",
        lastLogin: new Date().toISOString(),
      };
    const annotatorsData = JSON.parse(
      await getAllAnnotators()
    ) as Annotator[];
    const tasks = paginatedResponse.tasks as Task[]
    setCurrentPage(paginatedResponse.page)
    setTotalPages(paginatedResponse.pages)
    setTasks(

      tasks.map((task: Task) => ({
        ...task,
        reviewer: task.reviewer || projectManager._id, // Set project manager as default reviewer
      }))
    );
    

    setAnnotators([projectManager, ...annotatorsData]);
    setAllReviewers([projectManager, ...annotatorsData]);


  }
  async function handlePageChange(newPage:number){
    fetchTask(projectId,newPage);
    setCurrentPage(newPage)

  }

  async function handleAssignUser(
    annotatorId: string,
    taskId: string,
    ai: boolean,
    isReviewer: boolean = false
  ) {
    // Assuming you'll need to modify the changeAnnotator action to handle reviewer assignment
    const res = JSON.parse(
      await changeAnnotator(taskId, annotatorId, ai, isReviewer)
    );
    setTasks(
      tasks.map((task) => {
        if (task._id === taskId) {
          return isReviewer ? { ...res, reviewer: annotatorId } : res;
        }
        return task;
      })
    );
  }

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    const defaultTemplate = {
      name: newTemplateName.trim(),
      project: projectId,
    };
    const template: template = JSON.parse(
      await upsertTemplate(
        projectId as string,
        defaultTemplate as template,
        undefined,
        true
      )
    );
    router.push(`/template?Id=${template._id}`);
  };

  const handleDeleteTemplate = async (e: React.MouseEvent, _id: string) => {
    e.stopPropagation();
    try {
      await deleteTask(_id);
      removeJobByTaskid(_id);
      setTasks(tasks.filter((project) => project._id !== _id));
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: error.message,
      });
    }
  };

  const handleBulkAssignReviewers = async () => {
    if (allReviewers.length === 0) {
      toast({
        variant: "destructive",
        title: "Bulk reviewer assignment failed",
        description: "No reviewers available.",
      });
      return;
    }

    const tasksNeedingReviewer = tasks.filter((task) => !task.reviewer);
    const updatedTasks = [...tasks];

    for (let i = 0; i < tasksNeedingReviewer.length; i++) {
      const task = tasksNeedingReviewer[i];
      const reviewerIndex = (i % (allReviewers.length - 1)) + 1; // Skip project manager in rotation
      const reviewerId = allReviewers[reviewerIndex]._id;

      if (reviewerId === task.annotator) {
        // If reviewer would be same as annotator, assign project manager instead
        await changeAnnotator(task._id, allReviewers[0]._id, false, true);
        const taskIndex = updatedTasks.findIndex((t) => t._id === task._id);
        updatedTasks[taskIndex] = {
          ...task,
          reviewer: allReviewers[0]._id,
        };
      } else {
        await changeAnnotator(task._id, reviewerId, false, true);
        const taskIndex = updatedTasks.findIndex((t) => t._id === task._id);
        updatedTasks[taskIndex] = {
          ...task,
          reviewer: reviewerId,
        };
      }
    }

    setTasks(updatedTasks);
    toast({
      title: "Bulk reviewer assignment completed",
      description: `${tasksNeedingReviewer.length} tasks have been assigned reviewers.`,
    });
  };

  const handleAutoAssign = async () => {
    if (annotators.length === 0) {
      toast({
        variant: "destructive",
        title: "Auto-assign failed",
        description: "There are no annotators available.",
      });
      return;
    }

    const unassignedTasks = tasks.filter((task) => !task.annotator);
    const updatedTasks = [...tasks];

    for (let i = 0; i < unassignedTasks.length; i++) {
      const task = unassignedTasks[i];
      const annotatorIndex = i % annotators.length;
      const annotatorId = annotators[annotatorIndex]._id;

      // Try to assign a different annotator as reviewer, fall back to project manager
      const availableReviewers = allReviewers.filter(
        (r) => r._id !== annotatorId
      );
      const reviewerId =
        availableReviewers.length > 1
          ? availableReviewers[1]._id // Get first non-project-manager reviewer
          : allReviewers[0]._id; // Fall back to project manager

      await changeAnnotator(task._id, annotatorId, false, false);
      await changeAnnotator(task._id, reviewerId, false, true);

      const taskIndex = updatedTasks.findIndex((t) => t._id === task._id);
      updatedTasks[taskIndex] = {
        ...task,
        annotator: annotatorId,
        reviewer: reviewerId,
      };
    }

    setTasks(updatedTasks);
    toast({
      title: "Auto-assign completed",
      description: `${unassignedTasks.length} tasks have been assigned with annotators and reviewers.`,
    });
  };

  async function handleAssignAI() {
    const unassignedTasks = tasks.filter(
      (task) => !task.annotator && !task.ai && !task.submitted
    );

    if (unassignedTasks.length === 0) {
      toast({
        variant: "destructive",
        title: "AI assignment failed",
        description: "No unassigned tasks found.",
      });
      return;
    }
    var judgeIndex = 0;
    const updatedTasks: Task[] = [...tasks];
    for (const task of unassignedTasks) {
      if (!judges[judgeIndex]._id) {
        toast({
          variant: "destructive",
          title: "Fetching judges",
          description: "Please wait...",
        });
        return;
      }
      const res = await addJob(judges[judgeIndex]._id, task._id, projectId);
      if (res.error) {
        toast({
          variant: "destructive",
          title: "AI assignment failed",
          description: res.error,
        });
        return;
      }
      setJob(JSON.parse(res.model as string));
      await handleAssignUser(judges[judgeIndex]._id, task._id, true);
      const taskIndex = updatedTasks.findIndex((t) => t._id === task._id);
      updatedTasks[taskIndex] = { ...task, ai: judges[judgeIndex]._id };
      judgeIndex = (judgeIndex + 1) % judges.length;
    }
    setTasks(updatedTasks);
    toast({
      title: "AI assigned",
      description: `${unassignedTasks.length} tasks have been assigned to AI.
                    Please refresh the page to see the changes.`,
    });
  }

  const filteredTasks = {
    all: tasks,
    submitted: tasks.filter((task) => task.submitted),
    unassigned: tasks.filter((task) => !task.annotator || !task.reviewer),
  };

  const handleExport = (exportFormat: string) => {
    const dataToExport = filteredTasks[activeTab].map((task) => ({
      name: task.name,
      project: task.project,
      status: task.status,
      submitted: task.submitted ? "Yes" : "No",
      annotator:
        annotators.find((a) => a._id === task.annotator)?.name || "Unassigned",
      annotatorEmailAddress:annotators.find((a) => a._id === task.annotator)?.email || "Unassigned",
      reviewer:
        annotators.find((a) => a._id === task.reviewer)?.name || "Unassigned",
      reviewerEmailAddress:annotators.find((a) => a._id === task.reviewer)?.email || "Unassigned",
      ai: task.ai
        ? judges.find((j) => j._id === task.ai)?.name
        : "Not Assigned",
      created_at: format(parseISO(task.created_at), "PPPpp"),
      timeTaken: `${task.timeTaken || 0} minutes`,
      feedback: task.feedback || "No feedback",
    }));

    if (exportFormat === "json") {
      const dataStr = JSON.stringify(dataToExport, null, 2);
      const dataUri =
        "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
      const exportFileDefaultName = `tasks_${activeTab}.json`;
      const linkElement = document.createElement("a");
      linkElement.setAttribute("href", dataUri);
      linkElement.setAttribute("download", exportFileDefaultName);
      linkElement.click();
    } else {
      const headers = [
        "name",
        "project",
        "status",
        "submitted",
        "annotator",
        "annotatorEmailAddress",
        "reviewer",
        "reviewerEmailAddress" ,
        "ai",
        "created_at",
        "timeTaken",
        "feedback",
      ];
      const csvContent = [
        headers.join(","),
        ...dataToExport.map((row) =>
          headers
            .map((header) => `"${row[header as keyof typeof row]}"`)
            .join(",")
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", `tasks_${activeTab}.csv`);
      link.click();
    }

    setIsExportDialogOpen(false);
  };

  return (
    <div className="min-h-screen">
      <header className="bg-white">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Tasks
          </h1>
          <div className="flex gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExportDialogOpen(true)}
            >
              <FileDown className="h-4 w-4 mr-2" />
              Export
            </Button>
            <SheetMenu />
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto sm:px-6 lg:px-8">
        <form onSubmit={handleCreateTemplate} className="mb-8">
          <div className="flex gap-4">
            <Input
              type="text"
              required
              placeholder="New Template name"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              className="flex-grow"
            />
            <Button type="submit">
              <PlusCircle className="mr-2 h-4 w-4" /> Create Template
            </Button>
          </div>
        </form>
        {tasks.length === 0 ? (
          <div className="text-center py-10">
            <h2 className="text-xl font-semibold text-gray-900">
              No Tasks yet
            </h2>
            <p className="mt-2 text-gray-600">
              Create your first Template to get started!
            </p>
          </div>
        ) : (
          <>
            <Tabs
              value={activeTab}
              onValueChange={(value: string) =>
                setActiveTab(value as keyof typeof filteredTasks)
              }
            >
              <div className="flex flex-col gap-4 mb-4 md:flex-row md:items-center md:justify-between">
                <TabsList>
                  <TabsTrigger value="all">All Tasks</TabsTrigger>
                  <TabsTrigger value="submitted">Submitted Tasks</TabsTrigger>
                  <TabsTrigger value="unassigned">Unassigned Tasks</TabsTrigger>
                </TabsList>

                <div className="flex flex-wrap gap-2 items-center">
                  <TaskProgress setTasks={setTasks} />

                  <div className="flex gap-2">
                    <Button
                      onClick={handleAutoAssign}
                      variant="outline"
                      size="sm"
                    >
                      <Shuffle className="mr-2 h-4 w-4" /> Auto-assign
                      Annotators
                    </Button>

                    <Button
                      onClick={handleBulkAssignReviewers}
                      variant="outline"
                      size="sm"
                    >
                      <Shuffle className="mr-2 h-4 w-4" /> Auto-assign Reviewers
                    </Button>

                    {judges.length > 0 && (
                      <Button
                        onClick={handleAssignAI}
                        variant="outline"
                        size="sm"
                      >
                        <Bot className="mr-2 h-4 w-4" /> Assign AI
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <TabsContent value="all">
                <TaskTable
                  onPageChange={handlePageChange}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  setTasks={setTasks}
                  tasks={tasks}
                  annotators={annotators}
                  reviewers={allReviewers}
                  judges={judges}
                  handleAssignUser={handleAssignUser}
                  handleDeleteTemplate={handleDeleteTemplate}
                  router={router}
                  session={session}
                />
              </TabsContent>
              <TabsContent value="submitted">
                <TaskTable
                  currentPage={currentPage}
                  onPageChange={handlePageChange}
                  totalPages={totalPages}
                  setTasks={setTasks}
                  tasks={tasks}
                  annotators={annotators}
                  reviewers={allReviewers}
                  judges={judges}
                  handleAssignUser={handleAssignUser}
                  handleDeleteTemplate={handleDeleteTemplate}
                  router={router}
                  session={session}
                />
              </TabsContent>
              <TabsContent value="unassigned">
                <TaskTable 
                  onPageChange={handlePageChange}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  setTasks={setTasks}
                  tasks={tasks}
                  annotators={annotators}
                  reviewers={allReviewers}
                  judges={judges}
                  handleAssignUser={handleAssignUser}
                  handleDeleteTemplate={handleDeleteTemplate}
                  router={router}
                  session={session}
                />
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Tasks</DialogTitle>
            <DialogDescription>
              Choose your preferred export format for {activeTab} tasks
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleExport("csv")}>
              Export as CSV
            </Button>
            <Button onClick={() => handleExport("json")}>Export as JSON</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
