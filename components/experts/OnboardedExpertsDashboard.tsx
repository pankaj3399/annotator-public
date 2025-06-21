'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Download,
  FileText,
  Users,
  Calendar,
  BarChart3,
  ArrowUpDown,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { format, subDays, startOfMonth, subMonths } from 'date-fns';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  getDashboardStats,
  getNDAStatus,
  getTasksOverTimeData,
  getTeamExpertsWithStats,
} from '@/app/actions/onboardedExperts';
import {
  DashboardStatsCards,
  ExpertPerformanceTable,
  TasksOverTimeChart,
} from './DashboardCharts';

// Import our new components and actions

// Interfaces
interface Expert {
  _id: string;
  name: string;
  email: string;
  nda: string | null;
  domain: string[];
  lang: string[];
  location: string;
  created_at: string;
  lastLogin: string;
  stats: {
    totalTasks: number;
    totalTimeSpent: number;
    avgTimePerTask: number;
    acceptedTasks: number;
    rejectedTasks: number;
    successRate: number;
  };
}

interface NDAStatusData {
  uploaded: Array<{
    _id: string;
    name: string;
    email: string;
    ndaUrl: string;
  }>;
  notUploaded: Array<{
    _id: string;
    name: string;
    email: string;
  }>;
}

interface TasksOverTimeData {
  date: string;
  taskCount: number;
  totalTime: number;
  avgTime: number;
  successRate: string;
}

interface DashboardStatsData {
  totalExperts: number;
  activeExperts: number;
  totalTasks: number;
  avgCompletionTime: number;
  successRate: number;
}

const OnboardedExpertsDashboard: React.FC = () => {
  // State management
  const [experts, setExperts] = useState<Expert[]>([]);
  const [ndaStatus, setNDAStatus] = useState<NDAStatusData | null>(null);
  const [tasksOverTimeData, setTasksOverTimeData] = useState<
    TasksOverTimeData[]
  >([]);
  const [dashboardStats, setDashboardStats] =
    useState<DashboardStatsData | null>(null);

  // Loading states
  const [expertsLoading, setExpertsLoading] = useState(true);
  const [ndaLoading, setNDALoading] = useState(true);
  const [chartsLoading, setChartsLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [downloadingNDAs, setDownloadingNDAs] = useState(false);

  // Error states
  const [expertsError, setExpertsError] = useState<string | null>(null);
  const [chartsError, setChartsError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);

  // Filter states
  const [dateRange, setDateRange] = useState(() => ({
    start: subDays(new Date(), 30),
    end: new Date(),
  }));
  const [granularity, setGranularity] = useState<
    'daily' | 'weekly' | 'monthly'
  >('daily');
  const [taskType, setTaskType] = useState<
    'test' | 'training' | 'core' | 'all'
  >('all');
  const [selectedExpertId, setSelectedExpertId] = useState<string>('all');
  const [showTimeInsteadOfCount, setShowTimeInsteadOfCount] = useState(false);

  // NDA download state
  const [selectedExpertsForDownload, setSelectedExpertsForDownload] = useState<
    string[]
  >([]);
  const [isNDADialogOpen, setIsNDADialogOpen] = useState(false);

  const { data: session } = useSession();
  const router = useRouter();

  // Check if user is authorized
  useEffect(() => {
    if (session && session.user?.role !== 'project manager') {
      router.push('/unauthorized');
      return;
    }
  }, [session, router]);

  // Date range presets
  const dateRangePresets = [
    {
      label: 'Last 7 days',
      value: 'week',
      start: subDays(new Date(), 7),
      end: new Date(),
    },
    {
      label: 'Last 30 days',
      value: 'month',
      start: subDays(new Date(), 30),
      end: new Date(),
    },
    {
      label: 'Last 3 months',
      value: '3months',
      start: subDays(new Date(), 90),
      end: new Date(),
    },
    {
      label: 'This month',
      value: 'thisMonth',
      start: startOfMonth(new Date()),
      end: new Date(),
    },
    {
      label: 'Last month',
      value: 'lastMonth',
      start: startOfMonth(subMonths(new Date(), 1)),
      end: startOfMonth(new Date()),
    },
  ];

  // Fetch experts data
  const fetchExperts = useCallback(async () => {
    try {
      setExpertsLoading(true);
      setExpertsError(null);

      const response = await getTeamExpertsWithStats(dateRange);
      const data = JSON.parse(response);
      setExperts(data);
    } catch (error: any) {
      console.error('Error fetching experts:', error);
      setExpertsError(error.message || 'Failed to load experts data');
    } finally {
      setExpertsLoading(false);
    }
  }, [dateRange]);

  // Fetch NDA status
  const fetchNDAStatus = useCallback(async () => {
    try {
      setNDALoading(true);

      const response = await getNDAStatus();
      const data = JSON.parse(response);
      setNDAStatus(data);
    } catch (error: any) {
      console.error('Error fetching NDA status:', error);
      toast.error('Failed to load NDA status');
    } finally {
      setNDALoading(false);
    }
  }, []);

  // Fetch tasks over time data
  const fetchTasksOverTime = useCallback(async () => {
    try {
      setChartsLoading(true);
      setChartsError(null);

      const response = await getTasksOverTimeData(
        dateRange,
        granularity,
        taskType !== 'all' ? taskType : undefined,
        selectedExpertId !== 'all' ? selectedExpertId : undefined
      );
      const data = JSON.parse(response);
      setTasksOverTimeData(data);
    } catch (error: any) {
      console.error('Error fetching tasks over time:', error);
      setChartsError(error.message || 'Failed to load chart data');
    } finally {
      setChartsLoading(false);
    }
  }, [dateRange, granularity, taskType, selectedExpertId]);

  // Fetch dashboard stats
  const fetchDashboardStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      setStatsError(null);

      const response = await getDashboardStats(dateRange);
      const data = JSON.parse(response);
      setDashboardStats(data);
    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error);
      setStatsError(error.message || 'Failed to load dashboard stats');
    } finally {
      setStatsLoading(false);
    }
  }, [dateRange]);

  // Initial data fetch
  useEffect(() => {
    if (session && session.user?.role === 'project manager') {
      fetchExperts();
      fetchNDAStatus();
      fetchDashboardStats();
    }
  }, [session, fetchExperts, fetchNDAStatus, fetchDashboardStats]);

  // Fetch charts data when filters change
  useEffect(() => {
    if (session && session.user?.role === 'project manager') {
      fetchTasksOverTime();
    }
  }, [session, fetchTasksOverTime]);

  // Handle date range preset selection
  const handleDateRangePreset = (preset: (typeof dateRangePresets)[0]) => {
    setDateRange({ start: preset.start, end: preset.end });
  };

  // Handle NDA download
  const handleDownloadNDAs = async () => {
    try {
      setDownloadingNDAs(true);

      const expertIds =
        selectedExpertsForDownload.length > 0
          ? selectedExpertsForDownload
          : undefined;

      const response = await fetch('/api/dashboard/download-ndas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expertIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Download failed');
      }

      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Team_NDAs_${format(new Date(), 'yyyy-MM-dd')}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('NDAs downloaded successfully');
      setIsNDADialogOpen(false);
      setSelectedExpertsForDownload([]);
    } catch (error: any) {
      console.error('Error downloading NDAs:', error);
      toast.error(error.message || 'Failed to download NDAs');
    } finally {
      setDownloadingNDAs(false);
    }
  };

  // Handle expert selection for NDA download
  const handleExpertSelection = (expertId: string, checked: boolean) => {
    if (checked) {
      setSelectedExpertsForDownload((prev) => [...prev, expertId]);
    } else {
      setSelectedExpertsForDownload((prev) =>
        prev.filter((id) => id !== expertId)
      );
    }
  };

  // Handle select all/none for NDA download
  const handleSelectAllNDAs = (selectAll: boolean) => {
    if (selectAll && ndaStatus) {
      setSelectedExpertsForDownload(
        ndaStatus.uploaded.map((expert) => expert._id)
      );
    } else {
      setSelectedExpertsForDownload([]);
    }
  };

  if (!session || session.user?.role !== 'project manager') {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <h2 className='text-2xl font-bold text-gray-900 mb-2'>
            Access Denied
          </h2>
          <p className='text-gray-600'>
            Only project managers can access this dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100'>
      {/* Header */}
      <div className='bg-white/80 backdrop-blur-sm shadow-sm border-b border-white/20'>
        <div className='max-w-7xl mx-auto px-4 py-6'>
          <div className='flex justify-between items-center'>
            <div>
              <h1 className='text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent'>
                Experts Dashboard
              </h1>
              <p className='text-gray-600 mt-1'>
                Monitor and manage your team's performance
              </p>
            </div>

            <Dialog open={isNDADialogOpen} onOpenChange={setIsNDADialogOpen}>
              <DialogTrigger asChild>
                <Button className='bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all'>
                  <Download className='w-4 h-4 mr-2' />
                  Download NDAs
                </Button>
              </DialogTrigger>
              <DialogContent className='max-w-2xl'>
                <DialogHeader>
                  <DialogTitle>Download NDA Documents</DialogTitle>
                  <DialogDescription>
                    Select experts whose NDAs you want to download. All selected
                    NDAs will be packaged in a ZIP file.
                  </DialogDescription>
                </DialogHeader>

                {ndaLoading ? (
                  <div className='flex items-center justify-center py-8'>
                    <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
                  </div>
                ) : ndaStatus ? (
                  <div className='space-y-4'>
                    {/* Summary */}
                    <div className='bg-gray-50 p-4 rounded-lg'>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center space-x-4'>
                          <div className='flex items-center space-x-2'>
                            <CheckCircle className='w-5 h-5 text-green-600' />
                            <span className='font-medium'>
                              {ndaStatus.uploaded.length} NDAs uploaded
                            </span>
                          </div>
                          <div className='flex items-center space-x-2'>
                            <XCircle className='w-5 h-5 text-red-600' />
                            <span className='font-medium'>
                              {ndaStatus.notUploaded.length} pending
                            </span>
                          </div>
                        </div>
                        <div className='flex space-x-2'>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => handleSelectAllNDAs(true)}
                            disabled={ndaStatus.uploaded.length === 0}
                          >
                            Select All
                          </Button>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => handleSelectAllNDAs(false)}
                          >
                            Select None
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Experts with NDAs */}
                    {ndaStatus.uploaded.length > 0 ? (
                      <div className='space-y-2 max-h-64 overflow-y-auto'>
                        <h4 className='font-medium text-gray-900'>
                          Available NDAs:
                        </h4>
                        {ndaStatus.uploaded.map((expert) => (
                          <div
                            key={expert._id}
                            className='flex items-center space-x-3 p-2 hover:bg-gray-50 rounded'
                          >
                            <Checkbox
                              id={expert._id}
                              checked={selectedExpertsForDownload.includes(
                                expert._id
                              )}
                              onCheckedChange={(checked) =>
                                handleExpertSelection(
                                  expert._id,
                                  checked as boolean
                                )
                              }
                            />
                            <label
                              htmlFor={expert._id}
                              className='flex-1 cursor-pointer'
                            >
                              <div className='font-medium'>{expert.name}</div>
                              <div className='text-sm text-gray-500'>
                                {expert.email}
                              </div>
                            </label>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className='text-center py-4 text-gray-500'>
                        No NDAs have been uploaded yet.
                      </div>
                    )}

                    {/* Experts without NDAs */}
                    {ndaStatus.notUploaded.length > 0 && (
                      <div className='space-y-2'>
                        <h4 className='font-medium text-red-600'>
                          Pending NDAs:
                        </h4>
                        <div className='bg-red-50 p-3 rounded max-h-32 overflow-y-auto'>
                          {ndaStatus.notUploaded.map((expert) => (
                            <div
                              key={expert._id}
                              className='text-sm text-red-700'
                            >
                              {expert.name} ({expert.email})
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className='flex justify-end space-x-2 pt-4'>
                      <Button
                        variant='outline'
                        onClick={() => setIsNDADialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleDownloadNDAs}
                        disabled={
                          selectedExpertsForDownload.length === 0 ||
                          downloadingNDAs
                        }
                        className='bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                      >
                        {downloadingNDAs ? (
                          <>
                            <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2'></div>
                            Downloading...
                          </>
                        ) : (
                          <>
                            <Download className='w-4 h-4 mr-2' />
                            Download Selected (
                            {selectedExpertsForDownload.length})
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className='text-center py-4 text-red-500'>
                    Failed to load NDA status
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className='max-w-7xl mx-auto px-4 py-8 space-y-8'>
        {/* Dashboard Stats Cards */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6'>
          {statsLoading ? (
            // Loading skeleton
            Array.from({ length: 5 }).map((_, index) => (
              <Card key={index} className='border-0 shadow-lg'>
                <CardContent className='p-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg'>
                  <div className='animate-pulse space-y-3'>
                    <div className='h-4 bg-gray-300 rounded w-2/3'></div>
                    <div className='h-8 bg-gray-300 rounded w-1/2'></div>
                    <div className='h-3 bg-gray-300 rounded w-1/3'></div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : statsError ? (
            <div className='col-span-full text-center py-8 text-red-500'>
              {statsError}
            </div>
          ) : dashboardStats ? (
            <>
              {/* Total Experts */}
              <Card className='border-0 shadow-lg hover:shadow-xl transition-all duration-300'>
                <CardContent className='p-6 bg-gradient-to-br from-blue-100 via-blue-200 to-indigo-200 rounded-lg h-full'>
                  <div className='flex items-center justify-between'>
                    <div className='space-y-2'>
                      <p className='text-blue-700 font-medium text-sm'>
                        Total Experts
                      </p>
                      <p className='text-3xl font-bold text-blue-900'>
                        {dashboardStats.totalExperts}
                      </p>
                    </div>
                    <div className='p-3 bg-blue-300/50 rounded-full'>
                      <Users className='w-6 h-6 text-blue-700' />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Active Experts */}
              <Card className='border-0 shadow-lg hover:shadow-xl transition-all duration-300'>
                <CardContent className='p-6 bg-gradient-to-br from-green-100 via-green-200 to-emerald-200 rounded-lg h-full'>
                  <div className='flex items-center justify-between'>
                    <div className='space-y-2'>
                      <p className='text-green-700 font-medium text-sm'>
                        Active Experts
                      </p>
                      <p className='text-3xl font-bold text-green-900'>
                        {dashboardStats.activeExperts}
                      </p>
                      <p className='text-xs text-green-600'>
                        {dashboardStats.totalExperts > 0
                          ? `${((dashboardStats.activeExperts / dashboardStats.totalExperts) * 100).toFixed(1)}% of total`
                          : '0% of total'}
                      </p>
                    </div>
                    <div className='p-3 bg-green-300/50 rounded-full'>
                      <CheckCircle className='w-6 h-6 text-green-700' />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Total Tasks */}
              <Card className='border-0 shadow-lg hover:shadow-xl transition-all duration-300'>
                <CardContent className='p-6 bg-gradient-to-br from-purple-100 via-purple-200 to-violet-200 rounded-lg h-full'>
                  <div className='flex items-center justify-between'>
                    <div className='space-y-2'>
                      <p className='text-purple-700 font-medium text-sm'>
                        Total Tasks
                      </p>
                      <p className='text-3xl font-bold text-purple-900'>
                        {dashboardStats.totalTasks}
                      </p>
                    </div>
                    <div className='p-3 bg-purple-300/50 rounded-full'>
                      <BarChart3 className='w-6 h-6 text-purple-700' />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Avg Completion Time */}
              <Card className='border-0 shadow-lg hover:shadow-xl transition-all duration-300'>
                <CardContent className='p-6 bg-gradient-to-br from-orange-100 via-orange-200 to-amber-200 rounded-lg h-full'>
                  <div className='flex items-center justify-between'>
                    <div className='space-y-2'>
                      <p className='text-orange-700 font-medium text-sm'>
                        Avg Completion Time
                      </p>
                      <p className='text-3xl font-bold text-orange-900'>
                        {dashboardStats.avgCompletionTime}m
                      </p>
                    </div>
                    <div className='p-3 bg-orange-300/50 rounded-full'>
                      <Clock className='w-6 h-6 text-orange-700' />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Success Rate */}
              <Card className='border-0 shadow-lg hover:shadow-xl transition-all duration-300'>
                <CardContent className='p-6 bg-gradient-to-br from-pink-100 via-rose-200 to-red-200 rounded-lg h-full'>
                  <div className='flex items-center justify-between'>
                    <div className='space-y-2'>
                      <p className='text-pink-700 font-medium text-sm'>
                        Success Rate
                      </p>
                      <p className='text-3xl font-bold text-pink-900'>
                        {dashboardStats.successRate}%
                      </p>
                    </div>
                    <div className='p-3 bg-pink-300/50 rounded-full'>
                      {dashboardStats.successRate >= 80 ? (
                        <CheckCircle className='w-6 h-6 text-pink-700' />
                      ) : (
                        <XCircle className='w-6 h-6 text-pink-700' />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className='col-span-full text-center py-8 text-gray-500'>
              No data available
            </div>
          )}
        </div>

        {/* Filters Section */}
        <Card className='bg-white/70 backdrop-blur-sm shadow-lg border-white/20'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Filter className='w-5 h-5' />
              Filters & Controls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4'>
              {/* Date Range Presets */}
              <div className='lg:col-span-2'>
                <Label>Date Range</Label>
                <Select
                  value=''
                  onValueChange={(value) => {
                    const preset = dateRangePresets.find(
                      (p) => p.value === value
                    );
                    if (preset) handleDateRangePreset(preset);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Select date range' />
                  </SelectTrigger>
                  <SelectContent>
                    {dateRangePresets.map((preset) => (
                      <SelectItem key={preset.value} value={preset.value}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Granularity */}
              <div>
                <Label>Granularity</Label>
                <Select
                  value={granularity}
                  onValueChange={(value: any) => setGranularity(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='daily'>Daily</SelectItem>
                    <SelectItem value='weekly'>Weekly</SelectItem>
                    <SelectItem value='monthly'>Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Task Type */}
              <div>
                <Label>Task Type</Label>
                <Select
                  value={taskType}
                  onValueChange={(value: any) => setTaskType(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='All types' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>All Types</SelectItem>
                    <SelectItem value='test'>Test</SelectItem>
                    <SelectItem value='training'>Training</SelectItem>
                    <SelectItem value='core'>Core</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Expert Filter */}
              <div>
                <Label>Expert</Label>
                <Select
                  value={selectedExpertId}
                  onValueChange={setSelectedExpertId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='All experts' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>All Experts</SelectItem>
                    {experts.map((expert) => (
                      <SelectItem key={expert._id} value={expert._id}>
                        {expert.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Chart Type Toggle */}
              <div className='flex items-end'>
                <Button
                  variant={showTimeInsteadOfCount ? 'default' : 'outline'}
                  onClick={() =>
                    setShowTimeInsteadOfCount(!showTimeInsteadOfCount)
                  }
                  className='w-full'
                >
                  <ArrowUpDown className='w-4 h-4 mr-2' />
                  {showTimeInsteadOfCount ? 'Time' : 'Count'}
                </Button>
              </div>
            </div>

            {/* Current date range display */}
            <div className='mt-4 text-sm text-gray-600'>
              Showing data from {format(dateRange.start, 'MMM dd, yyyy')} to{' '}
              {format(dateRange.end, 'MMM dd, yyyy')}
            </div>
          </CardContent>
        </Card>

        {/* Charts Section */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
          {/* Tasks Over Time Chart */}
          <Card className='bg-white/70 backdrop-blur-sm shadow-lg border-white/20'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <BarChart3 className='w-5 h-5' />
                {showTimeInsteadOfCount
                  ? 'Time Spent Over Time'
                  : 'Tasks Completed Over Time'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TasksOverTimeChart
                data={tasksOverTimeData}
                isLoading={chartsLoading}
                error={chartsError}
                showTimeInstead={showTimeInsteadOfCount}
              />
            </CardContent>
          </Card>

          {/* Expert Performance Rankings */}
          <Card className='bg-white/70 backdrop-blur-sm shadow-lg border-white/20'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Users className='w-5 h-5' />
                Expert Performance Rankings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ExpertPerformanceTable
                data={experts}
                isLoading={expertsLoading}
                error={expertsError}
              />
            </CardContent>
          </Card>
        </div>

        {/* NDA Status Overview */}
        <Card className='bg-white/70 backdrop-blur-sm shadow-lg border-white/20'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <FileText className='w-5 h-5' />
              NDA Status Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ndaLoading ? (
              <div className='flex items-center justify-center py-8'>
                <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
              </div>
            ) : ndaStatus ? (
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                {/* Uploaded NDAs */}
                <div className='space-y-3'>
                  <div className='flex items-center gap-2'>
                    <CheckCircle className='w-5 h-5 text-green-600' />
                    <h3 className='font-semibold text-green-700'>
                      NDAs Uploaded ({ndaStatus.uploaded.length})
                    </h3>
                  </div>
                  <div className='space-y-2 max-h-64 overflow-y-auto'>
                    {ndaStatus.uploaded.length > 0 ? (
                      ndaStatus.uploaded.map((expert) => (
                        <div
                          key={expert._id}
                          className='flex items-center justify-between p-3 bg-green-50 rounded-lg'
                        >
                          <div>
                            <p className='font-medium text-green-900'>
                              {expert.name}
                            </p>
                            <p className='text-sm text-green-600'>
                              {expert.email}
                            </p>
                          </div>
                          <Badge
                            variant='default'
                            className='bg-green-100 text-green-800'
                          >
                            <CheckCircle className='w-3 h-3 mr-1' />
                            Uploaded
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className='text-green-600 text-center py-4'>
                        No NDAs uploaded yet
                      </p>
                    )}
                  </div>
                </div>

                {/* Pending NDAs */}
                <div className='space-y-3'>
                  <div className='flex items-center gap-2'>
                    <Clock className='w-5 h-5 text-orange-600' />
                    <h3 className='font-semibold text-orange-700'>
                      Pending NDAs ({ndaStatus.notUploaded.length})
                    </h3>
                  </div>
                  <div className='space-y-2 max-h-64 overflow-y-auto'>
                    {ndaStatus.notUploaded.length > 0 ? (
                      ndaStatus.notUploaded.map((expert) => (
                        <div
                          key={expert._id}
                          className='flex items-center justify-between p-3 bg-orange-50 rounded-lg'
                        >
                          <div>
                            <p className='font-medium text-orange-900'>
                              {expert.name}
                            </p>
                            <p className='text-sm text-orange-600'>
                              {expert.email}
                            </p>
                          </div>
                          <Badge
                            variant='secondary'
                            className='bg-orange-100 text-orange-800'
                          >
                            <Clock className='w-3 h-3 mr-1' />
                            Pending
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className='text-orange-600 text-center py-4'>
                        All NDAs have been uploaded!
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className='text-center py-4 text-red-500'>
                Failed to load NDA status
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OnboardedExpertsDashboard;
