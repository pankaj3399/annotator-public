"use client";

import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAllJobs } from "@/app/actions/job";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { PlusCircle, Pencil } from "lucide-react";

interface Job {
  _id: string;
  title: string;
  status: "draft" | "published";
  createdAt: string;
  projectId: string;
  content: string;
  compensation: string;
  location: string;
  lat: string;
  lng: string;
  projectDuration: {
    startDate: string;
    endDate: string;
  };
  updatedAt: string;
  __v: number;
}

const JobListingPage = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const pathName = usePathname();
  const projectId = pathName.split('/')[3]
  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await getAllJobs(projectId);
      console.log(response);
      setJobs(response);
    } catch (error) {
      console.error("Error fetching jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [projectId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="h-full space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Job Listings</h2>
          <p className="text-muted-foreground">
            Manage and create job postings for your project
          </p>
        </div>
        <Link href={`/projects/job-list/create/${projectId}`}>
          <Button size="sm" className="hover:shadow-md transition-all">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New Job
          </Button>
        </Link>
      </div>

      <Card className="border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-semibold">All Jobs</CardTitle>
          <div className="flex items-center space-x-2">
            {/* You can add filter/search controls here if needed */}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-[400px] items-center justify-center">
              <div className="flex flex-col items-center space-y-2">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
                <p className="text-sm text-muted-foreground">Loading jobs...</p>
              </div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[40%]">Job Title</TableHead>
                    <TableHead className="w-[20%]">Status</TableHead>
                    <TableHead className="w-[25%]">Created Date</TableHead>
                    <TableHead className="w-[15%]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow key={job._id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{job.title}</TableCell>
                      <TableCell>
                        <Badge
                          variant={job.status === "published" ? "default" : "secondary"}
                          className="capitalize"
                        >
                          {job.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(job.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Link href={`/projects/job-list/edit/${job._id}/${projectId}`}>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="hover:bg-primary/10 hover:text-primary"
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                  {jobs.length === 0 && (
                    <TableRow>
                      <TableCell 
                        colSpan={4} 
                        className="h-[300px] text-center"
                      >
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <p className="text-lg font-medium">No jobs found</p>
                          <p className="text-sm text-muted-foreground">
                            Get started by creating your first job posting
                          </p>
                          <Link href={`/projects/job-list/${projectId}/create`}>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="mt-4"
                            >
                              <PlusCircle className="mr-2 h-4 w-4" />
                              Create Job
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default JobListingPage;
