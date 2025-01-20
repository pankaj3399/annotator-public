"use client";

import React from "react";
import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAllJobApplications } from "@/app/actions/job";

interface User {
  _id: string;
  name: string;
  email: string;
}

interface Job {
  _id: string;
  title: string;
  status: "draft" | "published";
}

interface JobApplication {
  _id: string;
  jobId: Job;
  userId: User;
  status: string;
  appliedAt: string;
}

const JobApplicationsTable = () => {
  const [applications, setApplications] = useState<any>([]);
  const [loading, setLoading] = useState(true);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await getAllJobApplications();

      console.log(response);

      if (response.success) {
        setApplications(response.data);
      }
    } catch (error) {
      console.error("Error fetching applications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Job Applications</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-4">Loading...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job Title</TableHead>
                <TableHead>Project ID</TableHead>
                <TableHead>Applicant</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Applied Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.map((application: JobApplication) => (
                <TableRow key={application._id}>
                  <TableCell className="font-medium">
                    {application.jobId.title || "Empty"}
                  </TableCell>
                  <TableCell>{application.jobId._id || "Empty"}</TableCell>
                  <TableCell>{application.userId.name || "Empty"}</TableCell>
                  <TableCell>{application.userId.email || "Empty"}</TableCell>
                  <TableCell>
                    <Badge variant="default">{application.status || "Empty"}</Badge>
                  </TableCell>
                  <TableCell>{formatDate(application.appliedAt) || "Empty"}</TableCell>
                </TableRow>
              ))}
              {applications.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    No applications found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default JobApplicationsTable;