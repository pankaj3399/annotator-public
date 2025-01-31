import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePathname } from "next/navigation";
import { toast } from "@/components/ui/use-toast";
import { AlertCircle, CheckCircle2, Minus, Loader2 } from "lucide-react";
import { Task, Annotator } from "./page";
import { changeAnnotator, getAllUnassignedTasks } from "@/app/actions/task";

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

interface ReviewerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTasks: Task[];
  reviewers: Annotator[];
  setTasks: (tasks: Task[]) => void;
  tasks: Task[];
}

export default function ReviewerDialog({
  isOpen,
  onClose,
  selectedTasks,
  reviewers,
  setTasks,
  tasks
}: ReviewerDialogProps) {
  const [selectedReviewers, setSelectedReviewers] = useState<string[]>([]);
  const [assignmentMode, setAssignmentMode] = useState<"random" | "percentage" | "fixed">("random");
  const [reviewerPercentages, setReviewerPercentages] = useState<Record<string, number>>({});
  const [reviewerFixedCounts, setReviewerFixedCounts] = useState<Record<string, number>>({});
  const [totalTasks, setTotalTasks] = useState<number>(0);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [validationError, setValidationError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const pathname = usePathname();
  const projectId = pathname.split('/')[3];

  const allReviewersSelected = reviewers.length > 0 && selectedReviewers.length === reviewers.length;
  const someReviewersSelected = selectedReviewers.length > 0 && selectedReviewers.length < reviewers.length;

  const resetState = () => {
    setSelectedReviewers([]);
    setAssignmentMode("random");
    setReviewerPercentages({});
    setReviewerFixedCounts({});
    setValidationError("");
  };

  useEffect(() => {
    if (isOpen) {
      const fetchAllTasks = async () => {
        if (selectedTasks.length === 0) {
          const tasksFromAPI = await getAllUnassignedTasks(projectId);
          const parsedTasks = JSON.parse(tasksFromAPI);
          setAllTasks(parsedTasks);
          setTotalTasks(parsedTasks.length);
        } else {
          setTotalTasks(selectedTasks.length);
          setAllTasks(selectedTasks);
        }
      };
      fetchAllTasks();
      resetState();
    }
  }, [selectedTasks, projectId, isOpen]);

  useEffect(() => {
    validateAssignment();
  }, [reviewerPercentages, reviewerFixedCounts, selectedReviewers, assignmentMode]);

  const validateAssignment = () => {
    if (totalTasks === 0) {
      setValidationError("No tasks available for assignment");
      return false;
    }

    if (selectedReviewers.length === 0) {
      setValidationError("Please select at least one reviewer");
      return false;
    }

    if (assignmentMode === "percentage") {
      const totalPercentage = selectedReviewers.reduce(
        (sum, id) => sum + (reviewerPercentages[id] || 0),
        0
      );
      if (Math.abs(totalPercentage - 100) > 0.1) {
        setValidationError("Total percentage must equal 100%");
        return false;
      }
    }

    if (assignmentMode === "fixed") {
      const totalAssigned = selectedReviewers.reduce(
        (sum, id) => sum + (reviewerFixedCounts[id] || 0),
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
      setSelectedReviewers(reviewers.map(r => r._id));
      if (assignmentMode === "percentage") {
        const defaultPercentage = Math.floor(100 / reviewers.length);
        const remainder = 100 - (defaultPercentage * reviewers.length);
        const newPercentages: Record<string, number> = {};
        reviewers.forEach((r, index) => {
          newPercentages[r._id] = defaultPercentage + (index === 0 ? remainder : 0);
        });
        setReviewerPercentages(newPercentages);
      } else if (assignmentMode === "fixed") {
        const defaultCount = Math.floor(totalTasks / reviewers.length);
        const remainder = totalTasks - (defaultCount * reviewers.length);
        const newCounts: Record<string, number> = {};
        reviewers.forEach((r, index) => {
          newCounts[r._id] = defaultCount + (index === 0 ? remainder : 0);
        });
        setReviewerFixedCounts(newCounts);
      }
    } else {
      setSelectedReviewers([]);
    }
  };

  const toggleReviewerSelection = (id: string) => {
    setSelectedReviewers(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const handlePercentageChange = (id: string, value: string) => {
    const numValue = Math.max(0, Math.min(100, Number(value) || 0));
    setReviewerPercentages(prev => ({
      ...prev,
      [id]: numValue
    }));
  };

  const handleFixedCountChange = (id: string, value: string) => {
    const numValue = Math.max(0, Math.min(totalTasks, Number(value) || 0));
    setReviewerFixedCounts(prev => ({
      ...prev,
      [id]: numValue
    }));
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleAssign = async () => {
    if (!validateAssignment()) return;

    setIsLoading(true);
    try {
      const tasksToAssign = [...allTasks];
      let updatedTasks = [...tasks];
      let assignedTasks: Record<string, Task[]> = {};

      if (assignmentMode === "random") {
        for (let i = tasksToAssign.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [tasksToAssign[i], tasksToAssign[j]] = [tasksToAssign[j], tasksToAssign[i]];
        }
        
        tasksToAssign.forEach((task, index) => {
          const reviewerId = selectedReviewers[index % selectedReviewers.length];
          if (!assignedTasks[reviewerId]) assignedTasks[reviewerId] = [];
          assignedTasks[reviewerId].push(task);
        });
      } else if (assignmentMode === "percentage") {
        let currentIndex = 0;
        for (const reviewerId of selectedReviewers) {
          const percentage = reviewerPercentages[reviewerId] || 0;
          const count = Math.round((percentage / 100) * totalTasks);
          assignedTasks[reviewerId] = tasksToAssign.slice(currentIndex, currentIndex + count);
          currentIndex += count;
        }
      } else if (assignmentMode === "fixed") {
        let currentIndex = 0;
        for (const reviewerId of selectedReviewers) {
          const count = reviewerFixedCounts[reviewerId] || 0;
          assignedTasks[reviewerId] = tasksToAssign.slice(currentIndex, currentIndex + count);
          currentIndex += count;
        }
      }

      for (const [reviewerId, tasks] of Object.entries(assignedTasks)) {
        for (const task of tasks) {
          await changeAnnotator(task._id, reviewerId, false, true);
          updatedTasks = updatedTasks.map(t =>
            t._id === task._id ? { ...t, reviewer: reviewerId } : t
          );
        }
      }

      setTasks(updatedTasks);
      toast({
        title: "Success",
        description: `${totalTasks} tasks have been assigned to reviewers.`,
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
            Assign Reviewers
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            {totalTasks} tasks available for assignment
          </DialogDescription>
        </DialogHeader>

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
                  checked={allReviewersSelected}
                  indeterminate={someReviewersSelected && !allReviewersSelected}
                  onChange={handleSelectAllChange}
                />
              </div>
              <div className="font-medium text-sm">Reviewer</div>
              {assignmentMode !== "random" && (
                <div className="w-24 text-center font-medium text-sm">
                  {assignmentMode === "percentage" ? "Percentage" : "Tasks"}
                </div>
              )}
            </div>

            <div className="divide-y divide-gray-200 dark:divide-zinc-700">
              {reviewers.map((reviewer) => (
                <div key={reviewer._id} className="grid grid-cols-[auto,1fr,auto] gap-4 px-4 py-3 items-center hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                  <div className="w-12 flex justify-center">
                    <Checkbox
                      checked={selectedReviewers.includes(reviewer._id)}
                      onCheckedChange={() => toggleReviewerSelection(reviewer._id)}
                    />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{reviewer.name}</p>
                    <p className="text-sm text-gray-500">{reviewer.email}</p>
                  </div>
                  {assignmentMode === "percentage" && (
                    <Input
                      type="number"
                      className="w-24"
                      value={reviewerPercentages[reviewer._id] || ""}
                      onChange={(e) => handlePercentageChange(reviewer._id, e.target.value)}
                      placeholder="%"
                      disabled={!selectedReviewers.includes(reviewer._id)}
                    />
                  )}
                  {assignmentMode === "fixed" && (
                    <Input
                      type="number"
                      className="w-24"
                      value={reviewerFixedCounts[reviewer._id] || ""}
                      onChange={(e) => handleFixedCountChange(reviewer._id, e.target.value)}
                      placeholder="Tasks"
                      disabled={!selectedReviewers.includes(reviewer._id)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={selectedReviewers.length === 0 || !!validationError || isLoading}
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