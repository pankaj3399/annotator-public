'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, BarChart2, PieChart, Activity, Users } from 'lucide-react';
import Link from 'next/link';
import { 
  getTeamAnnotationMetrics, 
  getTemplateAnalytics,
  getDailyActivityMetrics, 
  getAnnotationQualityMetrics
} from '../../actions/dataScientist';
import { PieChart as RechartsPieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, TooltipProps } from 'recharts';

interface AnnotatorPerformance {
  annotatorId: string;
  name: string;
  email: string;
  tasksCompleted: number;
  avgTimePerTask: number;
  acceptanceRate: number;
  totalPoints: number;
}

interface AnnotationMetrics {
  annotatorCount: number;
  activeAnnotators: number;
  annotatorPerformance: AnnotatorPerformance[];
}

interface TemplateAnalytics {
  templateId: string;
  templateName: string;
  totalTasks: number;
  completedTasks: number;
  averageTime: number;
  acceptedTasks: number;
  rejectedTasks: number;
}

interface DailyActivity {
  date: string;
  taskCount: number;
  uniqueAnnotators: number;
  averageTime: number;
}

interface QualityMetric {
  annotatorId: string;
  annotatorName: string;
  annotatorEmail: string;
  projectId: string;
  totalPoints: number;
  totalComparisons: number;
  correctComparisons: number;
  accuracy: number;
  historyEntries: number;
}

// Custom Tooltip Component for Charts
interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 border rounded shadow-lg">
        <p className="font-medium">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AnalyticsPage(): React.ReactNode {
  const [annotationMetrics, setAnnotationMetrics] = useState<AnnotationMetrics | null>(null);
  const [templateData, setTemplateData] = useState<TemplateAnalytics[]>([]);
  const [activityData, setActivityData] = useState<DailyActivity[]>([]);
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetric[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Color schemes for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
  const STATUS_COLORS: Record<string, string> = {
    'accepted': '#10B981', // green
    'rejected': '#EF4444', // red
    'pending': '#F59E0B',  // amber
    'reassigned': '#6366F1' // indigo
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch annotation metrics
        const metricsResponse = await getTeamAnnotationMetrics();
        const metrics = JSON.parse(metricsResponse);
        setAnnotationMetrics(metrics);
        
        // Fetch template analytics
        const templateResponse = await getTemplateAnalytics();
        const templates = JSON.parse(templateResponse);
        setTemplateData(templates);
        
        // Fetch daily activity data
        const activityResponse = await getDailyActivityMetrics(30); // Last 30 days
        const activity = JSON.parse(activityResponse);
        setActivityData(activity);
        
        // Fetch quality metrics
        const qualityResponse = await getAnnotationQualityMetrics();
        const quality = JSON.parse(qualityResponse);
        setQualityMetrics(quality);
        
      } catch (error) {
        console.error('Error fetching analytics data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Prepare data for annotator performance chart
  const annotatorPerformanceData = annotationMetrics?.annotatorPerformance
    ?.sort((a, b) => b.tasksCompleted - a.tasksCompleted)
    ?.slice(0, 10) || [];

  // Prepare data for template performance chart
  const templatePerformanceData = templateData
    .filter(t => t.completedTasks > 0)
    .map(t => ({
      name: t.templateName.length > 20 ? `${t.templateName.substring(0, 20)}...` : t.templateName,
      completed: t.completedTasks,
      accepted: t.acceptedTasks,
      rejected: t.rejectedTasks
    }))
    .slice(0, 8);

  // Prepare data for the daily activity chart
  const formattedActivityData = activityData.map(day => ({
    date: day.date,
    tasks: day.taskCount,
    annotators: day.uniqueAnnotators,
    avgTime: Math.round(day.averageTime)
  }));

  // Prepare data for the quality pie chart
  const qualityDistribution = qualityMetrics.reduce<Record<string, number>>((acc, metric) => {
    // Group by accuracy range
    let range;
    if (metric.accuracy >= 90) range = '90-100%';
    else if (metric.accuracy >= 80) range = '80-89%';
    else if (metric.accuracy >= 70) range = '70-79%';
    else if (metric.accuracy >= 60) range = '60-69%';
    else range = 'Below 60%';
    
    acc[range] = (acc[range] || 0) + 1;
    return acc;
  }, {});

  const qualityPieData = Object.entries(qualityDistribution).map(([name, value]) => ({
    name,
    value
  }));

  // Prepare data for task status distribution
  const statusDistribution = templateData.reduce<Record<string, number>>((acc, template) => {
    acc.accepted = (acc.accepted || 0) + template.acceptedTasks;
    acc.rejected = (acc.rejected || 0) + template.rejectedTasks;
    acc.pending = (acc.pending || 0) + (template.totalTasks - template.completedTasks);
    return acc;
  }, {});

  const statusPieData = Object.entries(statusDistribution).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value
  }));

  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <Link href="/dataScientist/dashboard" className="mr-4">
          <ArrowLeft className="h-5 w-5 text-gray-500 hover:text-gray-700" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <BarChart2 className="mr-2 text-indigo-600" /> 
          Annotation Analytics
        </h1>
      </div>
      
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 h-80">
              <div className="animate-pulse h-full flex flex-col">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="flex-grow bg-gray-100 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Task Status Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium mb-4 flex items-center">
                <PieChart className="text-indigo-600 mr-2" /> 
                Task Status Distribution
              </h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={statusPieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {statusPieData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={STATUS_COLORS[entry.name.toLowerCase()] || COLORS[index % COLORS.length]} 
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Annotator Quality Distribution */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium mb-4 flex items-center">
                <Users className="text-indigo-600 mr-2" /> 
                Annotator Accuracy Distribution
              </h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={qualityPieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {qualityPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Daily Activity Trends */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-medium mb-4 flex items-center">
              <Activity className="text-indigo-600 mr-2" /> 
              Daily Activity Trends (Last 30 Days)
            </h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={formattedActivityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{fontSize: 12}}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getMonth()+1}/${date.getDate()}`;
                    }}
                  />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="tasks" 
                    name="Tasks Completed"
                    stroke="#8884d8" 
                    activeDot={{ r: 8 }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="annotators" 
                    name="Active Annotators"
                    stroke="#82ca9d" 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Template Performance */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-medium mb-4">Template Performance</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={templatePerformanceData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    tick={{fontSize: 12}}
                    width={150}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="completed" name="Total Completed" fill="#8884d8" />
                  <Bar dataKey="accepted" name="Accepted" fill="#82ca9d" />
                  <Bar dataKey="rejected" name="Rejected" fill="#ff8042" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Annotator Performance */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium mb-4">Top Annotator Performance</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={annotatorPerformanceData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    tick={{fontSize: 12}}
                    interval={0}
                    tickFormatter={(value) => value.split(' ')[0]}
                  />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar 
                    dataKey="tasksCompleted" 
                    name="Tasks Completed" 
                    fill="#8884d8" 
                  />
                  <Bar 
                    dataKey="acceptanceRate" 
                    name="Acceptance Rate (%)" 
                    fill="#82ca9d" 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}