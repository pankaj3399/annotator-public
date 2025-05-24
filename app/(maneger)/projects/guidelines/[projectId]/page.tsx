// app/projects/[projectId]/guidelines/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import Loader from "@/components/ui/NewLoader/Loader";
import { ArrowLeft, FileText } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from "@/components/ui/breadcrumb";
import ProjectGuidelines from "@/components/ProjectGuidelines";

export default function GuidelinesPage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const projectId = params.projectId as string;
  const [projectName, setProjectName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjectName = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}`);
        const data = await response.json();
        
        if (data.success) {
          setProjectName(data.project.name);
        }
      } catch (error) {
        console.error("Error fetching project:", error);
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      fetchProjectName();
    }
  }, [session, projectId]);

  if (status === "loading" || loading) {
    return <Loader />;
  }

  if (!session) {
    return (
      <Card className="max-w-md mx-auto mt-20">
        <CardContent className="py-10 text-center">
          <p>Please sign in to access this page.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <div className="mb-6">
        <Link
          href={`/projects/${projectId}`}
          className="text-sm flex items-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to project
        </Link>
      </div>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold flex items-center">
          <FileText className="mr-2 h-8 w-8" />
          {projectName}  <span className="ml-1">Guidelines</span>
        </h1>
      </div>

      <ProjectGuidelines />
    </div>
  );
}