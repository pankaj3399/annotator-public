'use client'
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePathname } from "next/navigation";
import { toast } from "@/components/ui/use-toast";
import { AlertCircle, CheckCircle2, Minus, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Task, Annotator } from "./page";
import { changeAnnotator, getAllUnassignedTasks } from "@/app/actions/task";

// Reuse the IndeterminateCheckbox component from ReviewerDialog
const IndeterminateCheckbox = ({
  checked,
  indeterminate,
  onChange
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: (checked: boolean) => void;
}) => {
  return (
    <div className="relative flex items-center justify-center">
      <Checkbox 
        checked={checked}
        onCheckedChange={onChange}
        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
      />
      {indeterminate && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Minus className="h-3 w-3 text-primary-foreground" />
        </div>
      )}
    </div>
  );
};

interface AnnotatorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTasks: Task[];
  annotators: Annotator[];
  reviewers: Annotator[]; // Needed for proper reviewer assignment
  setTasks: (tasks: Task[]) => void;
  tasks: Task[];
}

export default function AnnotatorDialog({
  isOpen,
  onClose,
  selectedTasks,
  annotators,
  reviewers,
  setTasks,
  tasks
}: AnnotatorDialogProps) {
  const [selectedAnnotators, setSelectedAnnotators] = useState<string[]>([]);
  const [assignmentMode, setAssignmentMode] = useState<"random" | "percentage" | "fixed">("random");
  const [annotatorPercentages, setAnnotatorPercentages] = useState<Record<string, number>>({});
  const [annotatorFixedCounts, setAnnotatorFixedCounts] = useState<Record<string, number>>({});
  const [totalTasks, setTotalTasks] = useState<number>(0);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [validationError, setValidationError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [assignReviewers, setAssignReviewers] = useState<boolean>(true);
  const annotatorsPerPage = 5;

  const pathname = usePathname();
  const projectId = pathname.split('/')[3];

  const filteredAnnotators = annotators.filter(annotator => 
    annotator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    annotator.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedAnnotators = filteredAnnotators.slice(
    (currentPage - 1) * annotatorsPerPage, 
    currentPage * annotatorsPerPage
  );

  const totalPages = Math.ceil(filteredAnnotators.length / annotatorsPerPage);

  const allAnnotatorsSelected = paginatedAnnotators.length > 0 && 
    paginatedAnnotators.every(a => selectedAnnotators.includes(a._id));
  const someAnnotatorsSelected = paginatedAnnotators.some(a => selectedAnnotators.includes(a._id)) && 
    !allAnnotatorsSelected;

  const resetState = () => {
    setSelectedAnnotators([]);
    setAssignmentMode("random");
    setAnnotatorPercentages({});
    setAnnotatorFixedCounts({});
    setValidationError("");
    setSearchTerm("");
    setCurrentPage(1);
    setAssignReviewers(true);
  };
useEffect(() => {
  if (isOpen) {
    const fetchAllTasks = async () => {
      if (selectedTasks.length === 0) {
        // REMOVE THE API CALL - REPLACE WITH LOCAL FILTERING
        // const tasksFromAPI = await getAllUnassignedTasks(projectId);
        // const parsedTasks = JSON.parse(tasksFromAPI);
        
        // NEW: Filter tasks locally for annotator assignment
        const availableTasks = tasks.filter(task => 
          !task.annotator || // Tasks without annotators
          !task.submitted || // Unsubmitted tasks can be reassigned
          task.status === 'pending' || // Pending tasks can be reassigned
          task.status === 'rejected' // Rejected tasks can be reassigned
        );
        
        setAllTasks(availableTasks);
        setTotalTasks(availableTasks.length);
      } else {
        setTotalTasks(selectedTasks.length);
        setAllTasks(selectedTasks);
      }
    };
    fetchAllTasks();
    resetState();
  }
}, [selectedTasks, projectId, isOpen, tasks])

  useEffect(() => {
    validateAssignment();
  }, [annotatorPercentages, annotatorFixedCounts, selectedAnnotators, assignmentMode]);

  const validateAssignment = () => {
    if (totalTasks === 0) {
      setValidationError("No tasks available for assignment");
      return false;
    }

    if (selectedAnnotators.length === 0) {
      setValidationError("Please select at least one annotator");
      return false;
    }

    if (assignmentMode === "percentage") {
      const totalPercentage = selectedAnnotators.reduce(
        (sum, id) => sum + (annotatorPercentages[id] || 0),
        0
      );
      if (Math.abs(totalPercentage - 100) > 0.1) {
        setValidationError("Total percentage must equal 100%");
        return false;
      }
    }

    if (assignmentMode === "fixed") {
      const totalAssigned = selectedAnnotators.reduce(
        (sum, id) => sum + (annotatorFixedCounts[id] || 0),
        0
      );
      if (totalAssigned !== totalTasks) {
        setValidationError(`Total assigned tasks must equal ${totalTasks}`);
        return false;
      }
    }

    setValidationError("");
    return true;
  };

  const handleSelectAllChange = (checked: boolean) => {
    if (checked) {
      const currentPageAnnotatorIds = paginatedAnnotators.map(a => a._id);
      setSelectedAnnotators(prev => {
        const newSelected = new Set([...prev, ...currentPageAnnotatorIds]);
        return Array.from(newSelected);
      });

      if (assignmentMode === "percentage") {
        const defaultPercentage = Math.floor(100 / paginatedAnnotators.length);
        const remainder = 100 - (defaultPercentage * paginatedAnnotators.length);
        const newPercentages: Record<string, number> = {};
        paginatedAnnotators.forEach((a, index) => {
          newPercentages[a._id] = defaultPercentage + (index === 0 ? remainder : 0);
        });
        setAnnotatorPercentages(prev => ({ ...prev, ...newPercentages }));
      } else if (assignmentMode === "fixed") {
        const defaultCount = Math.floor(totalTasks / paginatedAnnotators.length);
        const remainder = totalTasks - (defaultCount * paginatedAnnotators.length);
        const newCounts: Record<string, number> = {};
        paginatedAnnotators.forEach((a, index) => {
          newCounts[a._id] = defaultCount + (index === 0 ? remainder : 0);
        });
        setAnnotatorFixedCounts(prev => ({ ...prev, ...newCounts }));
      }
    } else {
      const currentPageAnnotatorIds = paginatedAnnotators.map(a => a._id);
      setSelectedAnnotators(prev => prev.filter(id => !currentPageAnnotatorIds.includes(id)));
    }
  };

  const toggleAnnotatorSelection = (id: string) => {
    setSelectedAnnotators(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const handlePercentageChange = (id: string, value: string) => {
    const numValue = Math.max(0, Math.min(100, Number(value) || 0));
    setAnnotatorPercentages(prev => ({
      ...prev,
      [id]: numValue
    }));
  };

  const handleFixedCountChange = (id: string, value: string) => {
    const numValue = Math.max(0, Math.min(totalTasks, Number(value) || 0));
    setAnnotatorFixedCounts(prev => ({
      ...prev,
      [id]: numValue
    }));
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Helper function to find an appropriate reviewer for a task
  const getReviewerForTask = (annotatorId: string) => {
    // Filter out the task's annotator from potential reviewers
    const availableReviewers = reviewers.filter(r => r._id !== annotatorId);
    
    // Return a reviewer if there are available ones, otherwise return the first reviewer
    return availableReviewers.length > 0 
      ? availableReviewers[Math.floor(Math.random() * availableReviewers.length)]._id 
      : reviewers.length > 0 ? reviewers[0]._id : null;
  };

  const handleAssign = async () => {
    if (!validateAssignment()) return;

    setIsLoading(true);
    try {
      const tasksToAssign = [...allTasks];
      let updatedTasks = [...tasks];
      let assignedTasks: Record<string, Task[]> = {};

      if (assignmentMode === "random") {
        // Shuffle tasks for random assignment
        for (let i = tasksToAssign.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [tasksToAssign[i], tasksToAssign[j]] = [tasksToAssign[j], tasksToAssign[i]];
        }
        
        tasksToAssign.forEach((task, index) => {
          const annotatorId = selectedAnnotators[index % selectedAnnotators.length];
          if (!assignedTasks[annotatorId]) assignedTasks[annotatorId] = [];
          assignedTasks[annotatorId].push(task);
        });
      } else if (assignmentMode === "percentage") {
        let currentIndex = 0;
        for (const annotatorId of selectedAnnotators) {
          const percentage = annotatorPercentages[annotatorId] || 0;
          const count = Math.round((percentage / 100) * totalTasks);
          assignedTasks[annotatorId] = tasksToAssign.slice(currentIndex, currentIndex + count);
          currentIndex += count;
        }
      } else if (assignmentMode === "fixed") {
        let currentIndex = 0;
        for (const annotatorId of selectedAnnotators) {
          const count = annotatorFixedCounts[annotatorId] || 0;
          assignedTasks[annotatorId] = tasksToAssign.slice(currentIndex, currentIndex + count);
          currentIndex += count;
        }
      }

      for (const [annotatorId, tasks] of Object.entries(assignedTasks)) {
        for (const task of tasks) {
          // Assign annotator
          await changeAnnotator(task._id, annotatorId, false, false);
          
          // Assign reviewer if option is enabled
          if (assignReviewers) {
            const reviewerId = getReviewerForTask(annotatorId);
            if (reviewerId) {
              await changeAnnotator(task._id, reviewerId, false, true);
              updatedTasks = updatedTasks.map(t =>
                t._id === task._id ? { ...t, annotator: annotatorId, reviewer: reviewerId } : t
              );
            } else {
              updatedTasks = updatedTasks.map(t =>
                t._id === task._id ? { ...t, annotator: annotatorId } : t
              );
            }
          } else {
            updatedTasks = updatedTasks.map(t =>
              t._id === task._id ? { ...t, annotator: annotatorId } : t
            );
          }
        }
      }
      
      setTasks(updatedTasks);
      toast({
        title: "Success",
        description: `${totalTasks} tasks have been assigned to annotators.`,
        duration: 3000,
      });
      handleClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to assign tasks. Please try again.",
        duration: 3000,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl bg-white dark:bg-zinc-900 rounded-xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold mb-2">
            Assign Annotators
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            {totalTasks} tasks available for assignment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Input 
            placeholder="Search annotators by name or email" 
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full"
          />

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Assignment Mode</label>
              <Select 
                onValueChange={(value) => {
                  setAssignmentMode(value as any);
                  setValidationError("");
                }} 
                value={assignmentMode}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="random">Random Distribution</SelectItem>
                  <SelectItem value="percentage">Percentage-based</SelectItem>
                  <SelectItem value="fixed">Fixed Count</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="assignReviewers" 
                checked={assignReviewers} 
                onCheckedChange={(checked) => setAssignReviewers(!!checked)}
              />
              <label 
                htmlFor="assignReviewers" 
                className="text-sm font-medium cursor-pointer"
              >
                Also assign reviewers automatically
              </label>
            </div>

            {validationError && (
              <Alert variant="destructive" className="bg-red-50 dark:bg-red-900/20">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <div className="grid grid-cols-[auto,1fr,auto] gap-4 px-4 py-2 bg-gray-100 dark:bg-zinc-800 rounded-t-lg items-center">
                <div className="w-12 flex justify-center">
                  <IndeterminateCheckbox
                    checked={allAnnotatorsSelected}
                    indeterminate={someAnnotatorsSelected}
                    onChange={handleSelectAllChange}
                  />
                </div>
                <div className="font-medium text-sm">Annotator</div>
                {assignmentMode !== "random" && (
                  <div className="w-24 text-center font-medium text-sm">
                    {assignmentMode === "percentage" ? "Percentage" : "Tasks"}
                  </div>
                )}
              </div>

              <div className="divide-y divide-gray-200 dark:divide-zinc-700">
                {paginatedAnnotators.map((annotator) => (
                  <div key={annotator._id} className="grid grid-cols-[auto,1fr,auto] gap-4 px-4 py-3 items-center hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                    <div className="w-12 flex justify-center">
                      <Checkbox
                        checked={selectedAnnotators.includes(annotator._id)}
                        onCheckedChange={() => toggleAnnotatorSelection(annotator._id)}
                      />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{annotator.name}</p>
                      <p className="text-sm text-gray-500">{annotator.email}</p>
                    </div>
                    {assignmentMode === "percentage" && (
                      <Input
                        type="number"
                        className="w-24"
                        value={annotatorPercentages[annotator._id] || ""}
                        onChange={(e) => handlePercentageChange(annotator._id, e.target.value)}
                        placeholder="%"
                        disabled={!selectedAnnotators.includes(annotator._id)}
                      />
                    )}
                    {assignmentMode === "fixed" && (
                      <Input
                        type="number"
                        className="w-24"
                        value={annotatorFixedCounts[annotator._id] || ""}
                        onChange={(e) => handleFixedCountChange(annotator._id, e.target.value)}
                        placeholder="Tasks"
                        disabled={!selectedAnnotators.includes(annotator._id)}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              <div className="flex justify-center items-center space-x-2 mt-4">
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={selectedAnnotators.length === 0 || !!validationError || isLoading}
            className="min-w-[100px]"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : validationError ? (
              <AlertCircle className="mr-2 h-4 w-4" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            {totalTasks === 0 ? "No Tasks" : isLoading ? "Assigning..." : "Assign"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}