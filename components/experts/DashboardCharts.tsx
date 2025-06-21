'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Clock, CheckCircle, Target } from 'lucide-react';

interface TasksOverTimeData {
  date: string;
  taskCount: number;
  totalTime: number;
  avgTime: number;
  successRate: string;
}

interface ExpertStatsData {
  _id: string;
  name: string;
  email: string;
  stats: {
    totalTasks: number;
    totalTimeSpent: number;
    avgTimePerTask: number;
    acceptedTasks: number;
    rejectedTasks: number;
    successRate: number;
  };
}

interface DashboardStatsData {
  totalExperts: number;
  activeExperts: number;
  totalTasks: number;
  avgCompletionTime: number;
  successRate: number;
}

// Tasks Over Time Chart Component
export const TasksOverTimeChart: React.FC<{
  data: TasksOverTimeData[];
  isLoading: boolean;
  error: string | null;
  showTimeInstead?: boolean;
}> = ({ data, isLoading, error, showTimeInstead = false }) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500">
        Error: {error}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No data available for the selected period
      </div>
    );
  }

  const yAxisKey = showTimeInstead ? 'totalTime' : 'taskCount';
  const label = showTimeInstead ? 'Time Spent (minutes)' : 'Tasks Completed';

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis 
          dataKey="date" 
          tick={{ fontSize: 12 }}
          stroke="#6b7280"
        />
        <YAxis 
          tick={{ fontSize: 12 }}
          stroke="#6b7280"
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
          formatter={(value, name) => [
            showTimeInstead ? `${value} min` : value,
            label
          ]}
        />
        <Line
          type="monotone"
          dataKey={yAxisKey}
          stroke="url(#colorGradient)"
          strokeWidth={3}
          dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, fill: '#1d4ed8' }}
        />
        <defs>
          <linearGradient id="colorGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </LineChart>
    </ResponsiveContainer>
  );
};

// Expert Performance Table Component
export const ExpertPerformanceTable: React.FC<{
  data: ExpertStatsData[];
  isLoading: boolean;
  error: string | null;
}> = ({ data, isLoading, error }) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center p-4">
        Error: {error}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-gray-500 text-center p-4">
        No experts found
      </div>
    );
  }

  // Sort by total tasks completed
  const sortedData = [...data].sort((a, b) => b.stats.totalTasks - a.stats.totalTasks);

  return (
    <div className="space-y-3">
      {sortedData.map((expert, index) => (
        <div
          key={expert._id}
          className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full text-sm font-semibold">
              {index + 1}
            </div>
            <div>
              <p className="font-medium text-gray-900">{expert.name}</p>
              <p className="text-sm text-gray-500">{expert.email}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="text-center">
              <p className="text-sm text-gray-500">Tasks</p>
              <p className="font-semibold text-gray-900">{expert.stats.totalTasks}</p>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-500">Avg Time</p>
              <p className="font-semibold text-gray-900">{Math.round(expert.stats.avgTimePerTask)}m</p>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-500">Success Rate</p>
              <Badge
                variant={expert.stats.successRate >= 80 ? "default" : 
                        expert.stats.successRate >= 60 ? "secondary" : "destructive"}
                className="font-semibold"
              >
                {expert.stats.successRate}%
              </Badge>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Dashboard Stats Cards Component
export const DashboardStatsCards: React.FC<{
  data: DashboardStatsData | null;
  isLoading: boolean;
  error: string | null;
}> = ({ data, isLoading, error }) => {
  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center p-4">
        Error loading stats: {error}
      </div>
    );
  }

  const statsCards = [
    {
      title: "Total Experts",
      value: data.totalExperts,
      icon: <Target className="h-5 w-5" />,
      gradient: "from-blue-500 to-blue-600"
    },
    {
      title: "Active Experts", 
      value: data.activeExperts,
      icon: <CheckCircle className="h-5 w-5" />,
      gradient: "from-green-500 to-green-600",
      subtext: `${data.totalExperts > 0 ? ((data.activeExperts / data.totalExperts) * 100).toFixed(1) : 0}% of total`
    },
    {
      title: "Total Tasks",
      value: data.totalTasks,
      icon: <TrendingUp className="h-5 w-5" />,
      gradient: "from-purple-500 to-purple-600"
    },
    {
      title: "Avg Completion Time",
      value: `${data.avgCompletionTime}m`,
      icon: <Clock className="h-5 w-5" />,
      gradient: "from-orange-500 to-orange-600"
    },
    {
      title: "Success Rate",
      value: `${data.successRate}%`,
      icon: data.successRate >= 80 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />,
      gradient: data.successRate >= 80 ? "from-emerald-500 to-emerald-600" : "from-red-500 to-red-600"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      {statsCards.map((stat, index) => (
        <Card key={index} className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-0">
            <div className={`bg-gradient-to-r ${stat.gradient} p-6 text-white`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium opacity-90">{stat.title}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  {stat.subtext && (
                    <p className="text-xs opacity-80 mt-1">{stat.subtext}</p>
                  )}
                </div>
                <div className="opacity-80">
                  {stat.icon}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};