'use client';

import React from 'react';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Users } from 'lucide-react';
import { getJobApplicationsByProject } from '@/app/actions/job';

interface User {
  _id: string;
  name: string;
  email: string;
}

interface Job {
  _id: string;
  title: string;
  status: 'draft' | 'published';
  projectId: string;
}

interface JobApplication {
  _id: string;
  jobId: Job;
  userId: User;
  status: string;
  appliedAt: string;
}

interface GroupedApplications {
  [jobId: string]: {
    jobInfo: Job;
    applications: JobApplication[];
  };
}

const JobApplicationsTable = () => {
  const params = useParams();
  const projectId = params.projectId as string;

  const [groupedApplications, setGroupedApplications] =
    useState<GroupedApplications>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());

  const fetchApplications = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getJobApplicationsByProject(projectId);

      if (!response) {
        throw new Error('No response received from server');
      }

      if (response.success) {
        const applicationData = response.data || {};
        setGroupedApplications(applicationData);
        
        // Auto-expand jobs that have applications
        const jobsWithApplications = Object.keys(applicationData);
        setExpandedJobs(new Set(jobsWithApplications));
      } else {
        const errorMessage = response.error || 'Failed to fetch applications';
        setError(errorMessage);
      }
    } catch (error) {
      setError(error?.message || 'An unexpected error occurred while fetching applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchApplications();
    } else {
      setLoading(false);
      setError('No project ID found in URL');
    }
  }, [projectId]);

  const toggleJobExpansion = (jobId: string) => {
    const newExpanded = new Set(expandedJobs);
    if (newExpanded.has(jobId)) {
      newExpanded.delete(jobId);
    } else {
      newExpanded.add(jobId);
    }
    setExpandedJobs(newExpanded);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getTotalApplicationsCount = () => {
    return Object.values(groupedApplications).reduce(
      (total, job) => total + job.applications.length,
      0
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card className='w-full'>
          <CardHeader>
            <CardTitle>Job Applications for Project</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='flex justify-center p-8'>
              <div className='text-center'>
                <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4'></div>
                <p>Loading applications...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className='w-full'>
          <CardHeader>
            <CardTitle>Error Loading Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-center p-8'>
              <Users className='h-12 w-12 text-red-500 mx-auto mb-4' />
              <p className='text-red-600 font-semibold'>{error}</p>
              <button 
                onClick={() => {
                  if (projectId) {
                    fetchApplications();
                  }
                }}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Retry
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const jobsArray = Object.entries(groupedApplications);

  return (
    <div className="container mx-auto p-6">
      <div className='w-full space-y-4'>
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Users className='h-5 w-5' />
              Job Applications Overview
            </CardTitle>
            <div className='text-sm text-muted-foreground'>
              Total Applications: {getTotalApplicationsCount()} across{' '}
              {jobsArray.length} job{jobsArray.length !== 1 ? 's' : ''}
            </div>
          </CardHeader>
        </Card>

        {jobsArray.length === 0 ? (
          <Card>
            <CardContent className='p-8'>
              <div className='text-center'>
                <Users className='h-12 w-12 text-muted-foreground mx-auto mb-4' />
                <h3 className='text-lg font-medium mb-2'>No Applications Yet</h3>
                <p className='text-muted-foreground'>
                  No job applications have been received for this project yet.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          jobsArray.map(([jobId, jobData]) => (
            <Card key={jobId} className='overflow-hidden'>
              <Collapsible
                open={expandedJobs.has(jobId)}
                onOpenChange={() => toggleJobExpansion(jobId)}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className='cursor-pointer hover:bg-muted/50 transition-colors'>
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-3'>
                        {expandedJobs.has(jobId) ? (
                          <ChevronDown className='h-4 w-4' />
                        ) : (
                          <ChevronRight className='h-4 w-4' />
                        )}
                        <div>
                          <CardTitle className='text-lg'>
                            {jobData.jobInfo.title}
                          </CardTitle>
                          <div className='flex items-center gap-2 mt-1'>
                            <Badge
                              variant={
                                jobData.jobInfo.status === 'published'
                                  ? 'default'
                                  : 'secondary'
                              }
                              className='text-xs'
                            >
                              {jobData.jobInfo.status}
                            </Badge>
                            <span className='text-sm text-muted-foreground'>
                              {jobData.applications.length} application
                              {jobData.applications.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className='pt-0'>
                    {jobData.applications.length === 0 ? (
                      <div className='text-center py-8 text-muted-foreground'>
                        <Users className='h-8 w-8 mx-auto mb-2 opacity-50' />
                        <p>No applications for this job yet</p>
                      </div>
                    ) : (
                      <div className='border rounded-lg overflow-hidden'>
                        <Table>
                          <TableHeader>
                            <TableRow className='bg-muted/30'>
                              <TableHead>Applicant</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Applied Date</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {jobData.applications.map((application) => (
                              <TableRow
                                key={application._id}
                                className='hover:bg-muted/20'
                              >
                                <TableCell className='font-medium'>
                                  {application.userId?.name || 'N/A'}
                                </TableCell>
                                <TableCell>
                                  {application.userId?.email || 'N/A'}
                                </TableCell>
                                <TableCell>
                                  <Badge variant='outline' className='text-xs'>
                                    {application.status || 'pending'}
                                  </Badge>
                                </TableCell>
                                <TableCell className='text-muted-foreground'>
                                  {application.appliedAt
                                    ? formatDate(application.appliedAt)
                                    : 'N/A'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default JobApplicationsTable;