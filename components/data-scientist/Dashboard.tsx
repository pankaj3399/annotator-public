'use client';

import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import { Terminal, BarChart2, Users, Database, FileText, Activity, Award } from 'lucide-react';
import { 
  getTeamMembers, 
  getTeamProjects, 
  getTeamAnnotationMetrics,
  getDailyActivityMetrics,
  getTemplateAnalytics
} from '../../app/actions/dataScientist';

interface TeamMember {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface Project {
  _id: string;
  name: string;
  project_Manager: {
    _id: string;
    name: string;
    email: string;
  };
}

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

// Component for displaying a metric card
interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description: string;
  loading?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon: Icon, description, loading = false }) => (
  <div className="bg-white rounded-lg shadow p-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      <div className="text-indigo-600">
        <Icon size={24} />
      </div>
    </div>
    {loading ? (
      <div className="animate-pulse h-8 bg-gray-200 rounded mb-2"></div>
    ) : (
      <div className="text-3xl font-bold text-gray-800 mb-2">{value}</div>
    )}
    <p className="text-gray-600 text-sm">{description}</p>
  </div>
);

// Dashboard component
export default function Dashboard() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamProjects, setTeamProjects] = useState<Project[]>([]);
  const [annotationMetrics, setAnnotationMetrics] = useState<AnnotationMetrics | null>(null);
  const [activityData, setActivityData] = useState<DailyActivity[]>([]);
  const [templateData, setTemplateData] = useState<TemplateAnalytics[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch team members
        const membersResponse = await getTeamMembers();
        const members = JSON.parse(membersResponse);
        setTeamMembers(members);
        
        // Fetch team projects
        const projectsResponse = await getTeamProjects();
        const projects = JSON.parse(projectsResponse);
        setTeamProjects(projects);
        
        // Fetch annotation metrics
        const metricsResponse = await getTeamAnnotationMetrics();
        const metrics = JSON.parse(metricsResponse);
        setAnnotationMetrics(metrics);
        
        // Fetch daily activity data
        const activityResponse = await getDailyActivityMetrics(30); // Last 30 days
        const activity = JSON.parse(activityResponse);
        setActivityData(activity);
        
        // Fetch template analytics
        const templateResponse = await getTemplateAnalytics();
        const templates = JSON.parse(templateResponse);
        setTemplateData(templates);
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Count active annotators
  const activeAnnotators = annotationMetrics?.annotatorPerformance?.length || 0;
  
  // Count total annotations
  const totalAnnotations = annotationMetrics?.annotatorPerformance?.reduce(
    (sum, annotator) => sum + annotator.tasksCompleted, 0
  ) || 0;
  
  // Calculate average acceptance rate
  const avgAcceptanceRate = annotationMetrics?.annotatorPerformance && 
    annotationMetrics.annotatorPerformance.length > 0 
    ? annotationMetrics.annotatorPerformance.reduce(
        (sum, annotator) => sum + annotator.acceptanceRate, 0
      ) / annotationMetrics.annotatorPerformance.length
    : 0;
  
  // Recent activity: last 7 days of task activity
  const recentActivity = activityData
    .slice(-7)
    .reduce((sum, day) => sum + day.taskCount, 0);
  
  // Top performing templates (by acceptance rate)
  const topTemplates = templateData
    .filter(t => t.completedTasks > 0)
    .sort((a, b) => {
      const aAcceptRate = a.acceptedTasks / a.completedTasks;
      const bAcceptRate = b.acceptedTasks / b.completedTasks;
      return bAcceptRate - aAcceptRate;
    })
    .slice(0, 3);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Data Science Dashboard</h1>
        <p className="text-gray-600">
          Access your team's annotation data and analytics to gain insights and improve models.
        </p>
      </div>
      
      {/* Jupyter Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Jupyter Environment</h2>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Terminal className="text-indigo-600 mr-2" />
              <span>Interactive Python Notebooks</span>
            </div>
            <Link 
              href="/dataScientist/notebook" 
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition-colors"
            >
              Launch Notebook
            </Link>
          </div>
          <p className="text-gray-600 text-sm">
            Access your Jupyter environment to create and run interactive notebooks with Python.
            All work is automatically saved in your browser and can directly access your team's annotation data.
          </p>
        </div>
      </div>
      
      {/* Key Metrics Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Team Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Team Size"
            value={teamMembers.length}
            icon={Users}
            description="Total members in your team"
            loading={loading}
          />
          <MetricCard
            title="Projects"
            value={teamProjects.length}
            icon={FileText}
            description="Total number of annotation projects"
            loading={loading}
          />
          <MetricCard
            title="Active Annotators"
            value={activeAnnotators}
            icon={Users}
            description="Annotators with completed tasks"
            loading={loading}
          />
          <MetricCard
            title="Total Annotations"
            value={totalAnnotations}
            icon={Database}
            description="Total number of completed annotations"
            loading={loading}
          />
        </div>
      </div>
      
      {/* Performance Metrics */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Performance Insights</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <MetricCard
            title="Avg. Acceptance Rate"
            value={`${avgAcceptanceRate.toFixed(1)}%`}
            icon={Award}
            description="Average task acceptance rate across annotators"
            loading={loading}
          />
          <MetricCard
            title="Recent Activity"
            value={recentActivity}
            icon={Activity}
            description="Tasks completed in the last 7 days"
            loading={loading}
          />
          <MetricCard
            title="Template Count"
            value={templateData.length}
            icon={BarChart2}
            description="Number of annotation templates across projects"
            loading={loading}
          />
        </div>
      </div>
      
      {/* Data Access Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Data Access</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium mb-4 flex items-center">
              <Database className="text-indigo-600 mr-2" /> 
              Raw Annotation Data
            </h3>
            <p className="text-gray-600 mb-4">
              Access and analyze raw annotation data from completed tasks across your team's projects.
            </p>
            <Link 
              href="/dataScientist/data" 
              className="text-indigo-600 font-medium hover:text-indigo-800"
            >
              Browse Data →
            </Link>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium mb-4 flex items-center">
              <BarChart2 className="text-indigo-600 mr-2" /> 
              Analytics Dashboard
            </h3>
            <p className="text-gray-600 mb-4">
              View detailed analytics on annotation quality, performance trends, and annotator metrics.
            </p>
            <Link 
              href="/dataScientist/analytics" 
              className="text-indigo-600 font-medium hover:text-indigo-800"
            >
              View Analytics →
            </Link>
          </div>
        </div>
      </div>
      
      {/* Top Performing Templates */}
      {topTemplates.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Top Performing Templates</h2>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Template Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tasks
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acceptance Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg. Time (sec)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {topTemplates.map((template) => (
                  <tr key={template.templateId}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {template.templateName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {template.completedTasks} / {template.totalTasks}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {template.completedTasks > 0 
                        ? `${((template.acceptedTasks / template.completedTasks) * 100).toFixed(1)}%`
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {template.averageTime.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Team Members Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Team Members</h2>
          <Link 
            href="/dataScientist/team" 
            className="text-indigo-600 text-sm font-medium hover:text-indigo-800"
          >
            View All →
          </Link>
        </div>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                Array(5).fill(0).map((_, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="animate-pulse h-4 bg-gray-200 rounded w-32"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="animate-pulse h-4 bg-gray-200 rounded w-24"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="animate-pulse h-4 bg-gray-200 rounded w-48"></div>
                    </td>
                  </tr>
                ))
              ) : (
                teamMembers.slice(0, 5).map((member) => (
                  <tr key={member._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {member.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.role}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.email}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}