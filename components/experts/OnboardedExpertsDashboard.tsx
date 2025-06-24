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
  Users,
  Calendar,
  BarChart3,
  ArrowUpDown,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  Activity,
} from 'lucide-react';
import { format, subDays, startOfMonth, subMonths } from 'date-fns';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  getOnboardedExpertsForProject,
  getDashboardStatsForProject,
  getTasksOverTimeDataForProject,
  getProjectDetails,
} from '@/app/actions/onboardedExperts';
import {
  DashboardStatsCards,
  ExpertPerformanceTable,
  TasksOverTimeChart,
} from './DashboardCharts';
import { ErrorBoundary } from '@/components/ErrorBoundaryWrapper';

// TypeScript interfaces for ErrorBoundary
interface SectionErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface SectionErrorBoundaryProps {
  children: React.ReactNode;
  onRetry?: () => void;
}

// Section Error Component using your UI style
const SectionRefreshError: React.FC<{
  error?: Error;
  onRetry?: () => void;
  title?: string;
  message?: string;
}> = ({
  error,
  onRetry,
  title = 'Section Failed to Load',
  message = 'This section encountered an issue. Please try refreshing it.',
}) => {
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      if (onRetry) {
        onRetry();
      }
      setIsRefreshing(false);
    }, 300);
  };

  const isTimeoutError =
    error?.message?.toLowerCase().includes('timeout') ||
    error?.message?.toLowerCase().includes('connection') ||
    error?.message?.toLowerCase().includes('database') ||
    error?.message?.toLowerCase().includes('fetch');

  return (
    <div className='bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-6 rounded-lg min-h-[200px]'>
      <div className='bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 max-w-md w-full text-center border border-white/20'>
        {/* Animated Icon */}
        <div className='mb-6 relative'>
          <div className='mx-auto w-16 h-16 bg-gradient-to-br from-red-400 via-orange-400 to-amber-400 rounded-full flex items-center justify-center shadow-lg'>
            {isRefreshing ? (
              <RefreshCw className='w-8 h-8 text-white animate-spin' />
            ) : isTimeoutError ? (
              <AlertCircle className='w-8 h-8 text-white' />
            ) : (
              <XCircle className='w-8 h-8 text-white' />
            )}
          </div>

          {/* Pulse rings */}
          <div className='absolute inset-0 w-16 h-16 mx-auto'>
            <div className='w-full h-full bg-orange-300 rounded-full animate-ping opacity-20'></div>
          </div>
        </div>

        {/* Title */}
        <h3 className='text-xl font-bold text-gray-800 mb-3 bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent'>
          {isRefreshing ? 'Refreshing...' : title}
        </h3>

        {/* Message */}
        <p className='text-gray-600 mb-6 text-sm leading-relaxed'>
          {isRefreshing
            ? 'Please wait while we refresh this section...'
            : message}
        </p>

        {/* Error details (only in dev mode) */}
        {process.env.NODE_ENV === 'development' && error && (
          <div className='mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-left'>
            <div className='flex items-center gap-2 mb-1'>
              <AlertCircle className='w-3 h-3 text-red-500' />
              <span className='text-xs font-semibold text-red-700'>
                Error Details
              </span>
            </div>
            <code className='text-xs text-red-600 break-all'>
              {error.message}
            </code>
          </div>
        )}

        {/* Refresh Button */}
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={`
            w-full py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-300 transform
            ${
              isRefreshing
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 hover:from-blue-600 hover:via-purple-600 hover:to-indigo-700 hover:scale-105 hover:shadow-lg active:scale-95'
            }
            text-white shadow-md
            flex items-center justify-center gap-2
          `}
        >
          <RefreshCw
            className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
          />
          {isRefreshing ? 'Refreshing...' : 'Try Again'}
        </button>

        {/* Status indicator */}
        <div className='mt-4 pt-3 border-t border-gray-200'>
          <div className='flex items-center justify-center gap-2 text-xs text-gray-500'>
            <div
              className={`w-2 h-2 rounded-full ${isTimeoutError ? 'bg-red-400' : 'bg-orange-400'}`}
            ></div>
            <span>{isTimeoutError ? 'Connection Issue' : 'Loading Error'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Simple ErrorBoundary component for individual sections
class SectionErrorBoundary extends React.Component<
  SectionErrorBoundaryProps,
  SectionErrorBoundaryState
> {
  constructor(props: SectionErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): SectionErrorBoundaryState {
    console.log('Section error caught:', error.message);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Section error details:', error, errorInfo);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <SectionRefreshError
          error={this.state.error}
          onRetry={() => {
            this.setState({ hasError: false, error: null });
            this.props.onRetry?.();
          }}
        />
      );
    }

    return this.props.children;
  }
}

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

interface TasksOverTimeData {
  date: string;
  taskCount: number;
  totalTime: number;
  avgTime: number;
  successRate: string;
}

interface DashboardStatsData {
  totalExperts: number;
  totalTasks: number;
  avgCompletionTime: number;
  successRate: number;
}

// Skeleton Components
const StatsSkeleton = () => (
  <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6'>
    {Array.from({ length: 5 }).map((_, index) => (
      <Card key={index} className='border-0 shadow-lg'>
        <CardContent className='p-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg'>
          <div className='animate-pulse space-y-3'>
            <div className='h-4 bg-gray-300 rounded w-2/3'></div>
            <div className='h-8 bg-gray-300 rounded w-1/2'></div>
            <div className='h-3 bg-gray-300 rounded w-1/3'></div>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

const ChartSkeleton = () => (
  <div className='h-64 bg-gray-100 rounded-lg animate-pulse flex items-center justify-center'>
    <div className='text-gray-400'>Loading chart...</div>
  </div>
);

const TableSkeleton = () => (
  <div className='space-y-3'>
    {Array.from({ length: 5 }).map((_, index) => (
      <div key={index} className='animate-pulse'>
        <div className='flex items-center justify-between p-4 bg-gray-100 rounded-lg'>
          <div className='flex items-center space-x-3'>
            <div className='w-8 h-8 bg-gray-300 rounded-full'></div>
            <div className='space-y-2'>
              <div className='h-4 bg-gray-300 rounded w-32'></div>
              <div className='h-3 bg-gray-300 rounded w-24'></div>
            </div>
          </div>
          <div className='flex space-x-6'>
            <div className='text-center space-y-1'>
              <div className='h-3 bg-gray-300 rounded w-8'></div>
              <div className='h-4 bg-gray-300 rounded w-6'></div>
            </div>
            <div className='text-center space-y-1'>
              <div className='h-3 bg-gray-300 rounded w-12'></div>
              <div className='h-4 bg-gray-300 rounded w-8'></div>
            </div>
            <div className='text-center space-y-1'>
              <div className='h-3 bg-gray-300 rounded w-16'></div>
              <div className='h-6 bg-gray-300 rounded w-12'></div>
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

const OnboardedExpertsDashboard: React.FC = () => {
  // State management
  const [experts, setExperts] = useState<Expert[]>([]);
  const [tasksOverTimeData, setTasksOverTimeData] = useState<TasksOverTimeData[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStatsData | null>(null);

  // Project state - get from localStorage
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>('');

  // Loading states - Sequential loading
  const [statsLoading, setStatsLoading] = useState(false);
  const [expertsLoading, setExpertsLoading] = useState(false);
  const [chartsLoading, setChartsLoading] = useState(false);

  // Error states
  const [statsError, setStatsError] = useState<string | null>(null);
  const [expertsError, setExpertsError] = useState<string | null>(null);
  const [chartsError, setChartsError] = useState<string | null>(null);

  // Loading phases
  const [currentPhase, setCurrentPhase] = useState<'stats' | 'experts' | 'charts' | 'complete'>('stats');

  // Filter states
  const [dateRange, setDateRange] = useState(() => ({
    start: subDays(new Date(), 30),
    end: new Date(),
  }));
  const [granularity, setGranularity] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [taskType, setTaskType] = useState<'test' | 'training' | 'core' | undefined>(undefined);
  const [selectedExpertId, setSelectedExpertId] = useState<string | undefined>(undefined);
  const [showTimeInsteadOfCount, setShowTimeInsteadOfCount] = useState(false);

  const { data: session } = useSession();
  const router = useRouter();

  // Check if user is authorized and get project ID
  useEffect(() => {
    if (session && session.user?.role !== 'project manager') {
      router.push('/unauthorized');
      return;
    }

    // Get project ID from localStorage
    const projectId = localStorage.getItem('currentProjectId');
    if (!projectId) {
      toast.error('No project selected. Please select a project first.');
      return;
    }

    setCurrentProjectId(projectId);
    
  getProjectDetails(projectId)
    .then((response) => {
      const data = JSON.parse(response);
      setProjectName(data.name);
    })
    .catch((error) => {
      console.error('Error fetching project name:', error);
      // Optionally set a fallback
      setProjectName('Current Project');
    });
  }, [session, router]);

  // Date range presets with proper typing
  const dateRangePresets: Array<{
    label: string;
    value: string;
    start: Date;
    end: Date;
  }> = [
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

  // PHASE 1: Fetch dashboard stats for project
  const fetchDashboardStats = useCallback(async () => {
    if (!currentProjectId) return;
    
    try {
      setStatsLoading(true);
      setStatsError(null);
      const response = await getDashboardStatsForProject(currentProjectId, dateRange);
      const data = JSON.parse(response);
      setDashboardStats(data);
    } catch (error: any) {
      console.error('Error fetching project dashboard stats:', error);
      setStatsError(error.message || 'Failed to load dashboard stats');
    } finally {
      setStatsLoading(false);
    }
  }, [currentProjectId, dateRange]);

  // PHASE 2: Fetch onboarded experts for project
  const fetchExperts = useCallback(async () => {
    if (!currentProjectId) return;
    
    try {
      setExpertsLoading(true);
      setExpertsError(null);
      const response = await getOnboardedExpertsForProject(currentProjectId, dateRange);
      const data = JSON.parse(response);
      setExperts(data);
    } catch (error: any) {
      console.error('Error fetching onboarded experts:', error);
      setExpertsError(error.message || 'Failed to load experts data');
    } finally {
      setExpertsLoading(false);
    }
  }, [currentProjectId, dateRange]);

  // PHASE 3: Fetch charts data for project
  const fetchTasksOverTime = useCallback(async () => {
    if (!currentProjectId) return;
    
    try {
      setChartsLoading(true);
      setChartsError(null);
      const response = await getTasksOverTimeDataForProject(
        currentProjectId,
        dateRange,
        granularity,
        taskType,
        selectedExpertId
      );
      const data = JSON.parse(response);
      setTasksOverTimeData(data);
    } catch (error: any) {
      console.error('Error fetching tasks over time:', error);
      setChartsError(error.message || 'Failed to load chart data');
    } finally {
      setChartsLoading(false);
    }
  }, [currentProjectId, dateRange, granularity, taskType, selectedExpertId]);

  // Sequential loading orchestrator
  const startSequentialLoading = useCallback(async () => {
    if (!session || session.user?.role !== 'project manager' || !currentProjectId) return;

    // Phase 1: Dashboard Stats
    setCurrentPhase('stats');
    fetchDashboardStats().catch((err) => {
      console.log('Stats section will handle its own error:', err.message);
    });

    // Small delay for better UX
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Phase 2: Experts
    setCurrentPhase('experts');
    fetchExperts().catch((err) => {
      console.log('Experts section will handle its own error:', err.message);
    });

    // Small delay for better UX
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Phase 3: Charts
    setCurrentPhase('charts');
    fetchTasksOverTime().catch((err) => {
      console.log('Charts section will handle its own error:', err.message);
    });

    // Mark as complete after all sections have had their chance
    setTimeout(() => setCurrentPhase('complete'), 1000);
  }, [
    session,
    currentProjectId,
    fetchDashboardStats,
    fetchExperts,
    fetchTasksOverTime,
  ]);

  // Initial sequential load when project is available
  useEffect(() => {
    if (currentProjectId) {
      startSequentialLoading();
    }
  }, [currentProjectId, startSequentialLoading]);

  // Refresh charts when filters change (but only if we've completed initial load)
  useEffect(() => {
    if (currentPhase === 'complete' && currentProjectId) {
      fetchTasksOverTime();
    }
  }, [fetchTasksOverTime, currentPhase, currentProjectId]);

  // Refresh stats and experts when date range changes
  useEffect(() => {
    if (currentPhase === 'complete' && currentProjectId) {
      fetchDashboardStats();
      fetchExperts();
    }
  }, [dateRange, fetchDashboardStats, fetchExperts, currentPhase, currentProjectId]);

  // Handle date range preset selection
  const handleDateRangePreset = (preset: (typeof dateRangePresets)[0]) => {
    setDateRange({ start: preset.start, end: preset.end });
  };

  // Individual retry handlers
  const retryStats = () => fetchDashboardStats();
  const retryExperts = () => fetchExperts();
  const retryCharts = () => fetchTasksOverTime();

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

  if (!currentProjectId) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <AlertCircle className='w-16 h-16 text-orange-500 mx-auto mb-4' />
          <h2 className='text-2xl font-bold text-gray-900 mb-2'>
            No Project Selected
          </h2>
          <p className='text-gray-600 mb-4'>
            Please select a project to view the onboarded experts dashboard.
          </p>
          <Button onClick={() => router.push('/projects')}>
            Go to Projects
          </Button>
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
                Onboarded Experts Dashboard
              </h1>
              <p className='text-gray-600 mt-1'>
                Project: <span className='font-semibold text-gray-800'>{projectName || 'Current Project'}</span>
              </p>
              <p className='text-sm text-gray-500 mt-1'>
                Showing experts who have completed test tasks for this project
              </p>
              {/* Loading indicator */}
              {currentPhase !== 'complete' && (
                <div className='flex items-center mt-2 text-sm text-blue-600'>
                  <RefreshCw className='w-4 h-4 mr-2 animate-spin' />
                  Loading{' '}
                  {currentPhase === 'stats'
                    ? 'dashboard stats'
                    : currentPhase === 'experts'
                      ? 'expert data'
                      : 'charts'}
                  ...
                </div>
              )}
            </div>

            {/* Project Info Card */}
            <div className='bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4'>
              <div className='flex items-center gap-2'>
                <Activity className='w-5 h-5 text-blue-600' />
                <span className='text-sm font-medium text-blue-900'>
                  Project-Specific View
                </span>
              </div>
              <p className='text-xs text-blue-700 mt-1'>
                Data filtered for current project only
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className='max-w-7xl mx-auto px-4 py-8 space-y-8'>
        {/* PHASE 1: Dashboard Stats Cards - Loads First */}
        <SectionErrorBoundary onRetry={retryStats}>
          {statsLoading && currentPhase === 'stats' ? (
            <StatsSkeleton />
          ) : statsError ? (
            <Card className='bg-white/70 backdrop-blur-sm shadow-lg border-white/20'>
              <CardContent className='p-6'>
                <SectionRefreshError
                  error={new Error(statsError)}
                  onRetry={retryStats}
                  title='Dashboard Stats Failed'
                  message='Unable to load dashboard statistics. This might be a temporary connection issue.'
                />
              </CardContent>
            </Card>
          ) : dashboardStats ? (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
              {/* Total Onboarded Experts */}
              <Card className='border-0 shadow-lg hover:shadow-xl transition-all duration-300'>
                <CardContent className='p-6 bg-gradient-to-br from-blue-100 via-blue-200 to-indigo-200 rounded-lg h-full'>
                  <div className='flex items-center justify-between'>
                    <div className='space-y-2'>
                      <p className='text-blue-700 font-medium text-sm'>
                        Onboarded Experts
                      </p>
                      <p className='text-3xl font-bold text-blue-900'>
                        {dashboardStats.totalExperts}
                      </p>
                      <p className='text-xs text-blue-600'>
                        Completed test tasks
                      </p>
                    </div>
                    <div className='p-3 bg-blue-300/50 rounded-full'>
                      <Users className='w-6 h-6 text-blue-700' />
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
                        Project Tasks
                      </p>
                      <p className='text-3xl font-bold text-purple-900'>
                        {dashboardStats.totalTasks}
                      </p>
                      <p className='text-xs text-purple-600'>
                        Completed by experts
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
                      <p className='text-xs text-orange-600'>
                        Per task average
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
                      <p className='text-xs text-pink-600'>
                        Task acceptance rate
                      </p>
                    </div>
                    <div className='p-3 bg-pink-300/50 rounded-full'>
                      <TrendingUp className='w-6 h-6 text-pink-700' />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : currentPhase !== 'stats' ? (
            <StatsSkeleton />
          ) : null}
        </SectionErrorBoundary>

        {/* Filters Section - Only show after stats are loaded */}
        {(currentPhase === 'experts' ||
          currentPhase === 'charts' ||
          currentPhase === 'complete') && (
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
                    onValueChange={(value: 'daily' | 'weekly' | 'monthly') =>
                      setGranularity(value)
                    }
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
                    value={taskType || 'all'}
                    onValueChange={(value) => {
                      setTaskType(
                        value === 'all'
                          ? undefined
                          : (value as 'test' | 'training' | 'core')
                      );
                    }}
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
                    value={selectedExpertId || 'all'}
                    onValueChange={(value) => {
                      setSelectedExpertId(value === 'all' ? undefined : value);
                    }}
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
                {format(dateRange.end, 'MMM dd, yyyy')} for project: {projectName || 'Current Project'}
              </div>
            </CardContent>
          </Card>
        )}

        {/* PHASE 3: Charts Section - Loads Second */}
        {(currentPhase === 'charts' || currentPhase === 'complete') && (
          <SectionErrorBoundary onRetry={retryCharts}>
            <Card className='bg-white/70 backdrop-blur-sm shadow-lg border-white/20'>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <BarChart3 className='w-5 h-5' />
                  {showTimeInsteadOfCount
                    ? 'Time Spent Over Time'
                    : 'Tasks Completed Over Time'}
                  {chartsLoading && (
                    <RefreshCw className='w-4 h-4 animate-spin' />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {chartsLoading ? (
                  <ChartSkeleton />
                ) : chartsError ? (
                  <SectionRefreshError
                    error={new Error(chartsError)}
                    onRetry={retryCharts}
                    title='Charts Failed'
                    message='Unable to load chart data. This might be a temporary connection issue.'
                  />
                ) : (
                  <TasksOverTimeChart
                    data={tasksOverTimeData}
                    isLoading={false}
                    error={null}
                    showTimeInstead={showTimeInsteadOfCount}
                  />
                )}
              </CardContent>
            </Card>
          </SectionErrorBoundary>
        )}

        {/* PHASE 2: Expert Performance - Loads Last */}
        {(currentPhase === 'experts' ||
          currentPhase === 'charts' ||
          currentPhase === 'complete') && (
          <SectionErrorBoundary onRetry={retryExperts}>
            <Card className='bg-white/70 backdrop-blur-sm shadow-lg border-white/20'>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <Users className='w-5 h-5' />
                  Onboarded Expert Performance Rankings
                  {expertsLoading && (
                    <RefreshCw className='w-4 h-4 animate-spin' />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {expertsLoading ? (
                  <TableSkeleton />
                ) : expertsError ? (
                  <SectionRefreshError
                    error={new Error(expertsError)}
                    onRetry={retryExperts}
                    title='Expert Data Failed'
                    message='Unable to load expert performance data. This might be a temporary connection issue.'
                  />
                ) : experts.length === 0 ? (
                  <div className='text-center py-12'>
                    <Users className='w-16 h-16 text-gray-400 mx-auto mb-4' />
                    <h3 className='text-lg font-semibold text-gray-700 mb-2'>
                      No Onboarded Experts Found
                    </h3>
                    <p className='text-gray-500 max-w-md mx-auto'>
                      No experts have completed test tasks for this project yet. 
                      Experts need to successfully complete test tasks to appear in this dashboard.
                    </p>
                  </div>
                ) : (
                  <ExpertPerformanceTable
                    data={experts}
                    isLoading={false}
                    error={null}
                  />
                )}
              </CardContent>
            </Card>
          </SectionErrorBoundary>
        )}
      </div>
    </div>
  );
};

// Wrap with your existing ErrorBoundary
const OnboardedExpertsDashboardWithErrorBoundary: React.FC = () => {
  return (
    <ErrorBoundary>
      <OnboardedExpertsDashboard />
    </ErrorBoundary>
  );
};

export default OnboardedExpertsDashboardWithErrorBoundary;