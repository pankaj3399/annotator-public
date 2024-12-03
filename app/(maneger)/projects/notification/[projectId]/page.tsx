"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useToast } from "@/hooks/use-toast";
import Loader from "@/components/ui/Loader/Loader";
import NotificationCard from "@/components/global/NotificationCard";
import { Button } from "@/components/ui/button";

interface NotificationTemplate {
  _id: string;
  triggerName: string;
  triggerBody: string;
  project: string;
  active: boolean;
}

const triggerOptions = ["accepted", "rejected"]; // Predefined options

export default function NotificationTemplatePage() {
  const router = useRouter();
  const { projectId } = useParams();
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId || status === "loading") return;

    if (!session || session.user.role !== "project manager") {
      router.push("/tasks");
      return;
    }

    const fetchTemplates = async () => {
      try {
        const response = await fetch(
          `/api/projects/${projectId}/notifications`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch templates");
        }

        setTemplates(data.templates || []);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description:
            error instanceof Error ? error.message : "Failed to load templates",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, [session, projectId, toast, router, status]);

  const handleSaveTemplate = async (id: string) => {
    try {
      const templateToSave = templates.find((t) => t._id === id);
      if (!templateToSave) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Template not found.",
        });
        return;
      }

      // Ensure the selected trigger name is unique
      const duplicate = templates.some(
        (t) => t.triggerName === templateToSave.triggerName && t._id !== id
      );
      if (duplicate) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "This trigger type is already used.",
        });
        return;
      }

      const response = await fetch(
        `/api/projects/${projectId}/notifications/${id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(templateToSave),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save changes.");
      }

      toast({
        title: "Success",
        description: "Changes saved successfully.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to save changes.",
      });
    }
  };

  const handleCreateTemplate = async () => {
    if (templates.length >= triggerOptions.length) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "All trigger types have been used.",
      });
      return;
    }

    // Find an available trigger that hasn't been used yet
    const availableTrigger = triggerOptions.find(
      (trigger) => !templates.some((template) => template.triggerName === trigger)
    );

    if (!availableTrigger) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No available trigger types left.",
      });
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          triggerName: availableTrigger,
          triggerBody: "New Body",
          active: true,
          project: projectId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create template");
      }

      setTemplates((prev) => [...prev, data.template]);

      toast({
        title: "Success",
        description: "Notification template created successfully.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to create template",
      });
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/notifications/${id}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ _id: id }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete template.");
      }

      setTemplates((prev) => prev.filter((t) => t._id !== id));

      toast({
        title: "Success",
        description: "Notification template deleted successfully.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to delete template.",
      });
    }
  };

  const handleUpdateTemplate = (id: string, field: string, value: string) => {
    const existingSelection = templates.find(
      (template) => template[field as keyof NotificationTemplate] === value
    );

    if (existingSelection) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "This trigger type is already used.",
      });
      return;
    }

    setTemplates((prev) =>
      prev.map((t) => (t._id === id ? { ...t, [field]: value } : t))
    );
  };

  if (loading || !projectId || status === "loading") {
    return <Loader />;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">
        Notification Templates
      </h1>

      <Button onClick={handleCreateTemplate}>Create a New Trigger</Button>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        {templates.map((template) => (
          <NotificationCard
            key={template._id}
            template={template}
            availableTriggers={triggerOptions}
            onUpdate={handleUpdateTemplate}
            onSave={handleSaveTemplate}
            onDelete={handleDeleteTemplate}
          />
        ))}
      </div>
    </div>
  );
}
