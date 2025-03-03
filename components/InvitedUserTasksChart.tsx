import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, TooltipProps, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Task {
  _id: string;
  timeTaken: number;
  submitted: boolean;
  status: string;
  updatedAt: string;
}

interface InvitedUserTasksChartProps {
  assignedTasks: Task[];
  completedTasks: Task[];
  loading: boolean;
}

interface CustomTooltipProps extends TooltipProps<number, string> {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: any;
  }>;
}

interface CustomLabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
  index: number;
}

interface DataItem {
  name: string;
  value: number;
  color: string;
}

interface BarCustomTooltipProps {
  active?: boolean;
  payload?: Array<any>;
  label?: string;
}

const InvitedUserTasksChart: React.FC<InvitedUserTasksChartProps> = ({ assignedTasks, completedTasks, loading }) => {
  const [animationComplete, setAnimationComplete] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('progress');
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimationComplete(true);
    }, 1200);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Calculate the counts for progress chart
  const totalAssigned = assignedTasks.length;
  const totalCompleted = completedTasks.length;
  const totalPending = totalAssigned - totalCompleted;
  
  // Data for the progress chart
  const progressData: DataItem[] = [
    { name: 'Completed', value: totalCompleted, color: '#10B981' }, // Green
    { name: 'Pending', value: totalPending, color: '#F59E0B' }      // Amber
  ];
  
  // Process data for the status breakdown chart
  const prepareStatusData = (): DataItem[] => {
    // Count tasks by status
    const statusCounts = completedTasks.reduce((acc: Record<string, number>, task) => {
      const status = task.status.toLowerCase();
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    
    // Convert to array format for chart
    return [
      { 
        name: 'Accepted', 
        value: statusCounts.accepted || 0,
        color: '#10B981'  // Green
      },
      { 
        name: 'Pending', 
        value: statusCounts.pending || 0,
        color: '#F59E0B'  // Amber
      },
      { 
        name: 'Rejected', 
        value: statusCounts.rejected || 0,
        color: '#EF4444'  // Red
      },
      { 
        name: 'Reassigned', 
        value: statusCounts.reassigned || 0,
        color: '#6366F1'  // Indigo
      }
    ];
  };
  
  const statusData = prepareStatusData();
  
  // Custom tooltip for progress chart
  const ProgressTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const percentage = totalAssigned > 0 ? ((payload[0].value / totalAssigned) * 100).toFixed(1) : '0';
      return (
        <div className="bg-white p-4 border border-gray-200 shadow-lg rounded-lg">
          <p className="font-medium text-lg">{payload[0].name} Tasks</p>
          <p className="text-gray-800 font-bold">{payload[0].value} tasks</p>
          <p className="text-gray-600">{percentage}% of assigned tasks</p>
        </div>
      );
    }
    return null;
  };
  
  // Custom tooltip for status chart
  const StatusTooltip: React.FC<BarCustomTooltipProps> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const percentage = completedTasks.length > 0 ? 
        ((payload[0].value / completedTasks.length) * 100).toFixed(1) : '0';
      return (
        <div className="bg-white p-4 border border-gray-200 shadow-lg rounded-lg">
          <p className="font-medium text-lg">{label}</p>
          <p className="text-gray-800 font-bold">{payload[0].value} tasks</p>
          <p className="text-gray-600">{percentage}% of submitted tasks</p>
        </div>
      );
    }
    return null;
  };
  
  // Custom label for the pie chart
  const renderCustomLabel = (props: CustomLabelProps): JSX.Element => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    const animatedPercent = animationComplete 
      ? (percent * 100).toFixed(0) 
      : '0';
    
    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor="middle" 
        dominantBaseline="central"
        className="text-lg font-bold"
      >
        {animatedPercent}%
      </text>
    );
  };
  
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Task Charts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full flex items-center justify-center">
            <Skeleton className="h-48 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const completionRate = totalAssigned > 0 
    ? Math.round((totalCompleted / totalAssigned) * 100) 
    : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <CardTitle className="text-xl font-bold">Task Overview</CardTitle>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
            <TabsList>
              <TabsTrigger value="progress">Progress</TabsTrigger>
              <TabsTrigger value="status">Status</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {/* Progress Chart Tab Content */}
        {activeTab === 'progress' && (
          <div className="space-y-4">
            <div className="h-80 w-full relative">
              {/* Center content showing completion rate */}
              <div className="absolute inset-0 flex items-center justify-center z-0">
                <div className="w-32 h-32 rounded-full bg-white shadow-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-800">{completionRate}%</div>
                    <div className="text-gray-500 text-sm">Completion</div>
                  </div>
                </div>
              </div>
              
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
                      <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3" />
                    </filter>
                  </defs>
                  
                  <Pie
                    data={progressData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={4}
                    dataKey="value"
                    label={renderCustomLabel}
                    labelLine={false}
                    isAnimationActive={true}
                    animationBegin={0}
                    animationDuration={1200}
                    animationEasing="ease-out"
                    filter="url(#shadow)"
                  >
                    {progressData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color} 
                        stroke="white"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  
                  <Tooltip content={<ProgressTooltip />} />
                  
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    iconSize={10}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-white p-3 rounded-lg shadow-sm">
                <div className="flex items-center mb-1">
                  <div className="w-3 h-3 rounded-full mr-2 bg-green-500"></div>
                  <div className="text-sm font-medium text-gray-600">Completed</div>
                </div>
                <div className="text-xl font-bold">{totalCompleted}</div>
              </div>
              
              <div className="bg-white p-3 rounded-lg shadow-sm">
                <div className="flex items-center mb-1">
                  <div className="w-3 h-3 rounded-full mr-2 bg-amber-500"></div>
                  <div className="text-sm font-medium text-gray-600">Pending</div>
                </div>
                <div className="text-xl font-bold">{totalPending}</div>
              </div>
            </div>
          </div>
        )}
        
        {/* Status Chart Tab Content */}
        {activeTab === 'status' && (
          <div className="space-y-4">
            <div className="text-center mb-3">
              <div className="text-3xl font-bold text-gray-800">{completedTasks.length}</div>
              <div className="text-gray-500 text-sm">Total Submitted Tasks</div>
            </div>
          
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={statusData}
                  layout="vertical"
                  margin={{ top: 20, right: 20, left: 60, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.1} />
                  <XAxis type="number" />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    axisLine={false}
                    width={70}
                  />
                  <Tooltip content={<StatusTooltip />} />
                  {statusData.map((entry, index) => (
                    <Bar 
                      key={`bar-${index}`}
                      dataKey="value" 
                      fill={entry.color}
                      background={{ fill: '#f3f4f6' }}
                      radius={[0, 4, 4, 0]}
                      isAnimationActive={true}
                      animationBegin={index * 200}
                      animationDuration={1000}
                      animationEasing="ease-out"
                      name={entry.name}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
              {statusData.map((item, index) => (
                <div key={`stat-${index}`} className="text-center py-2">
                  <div className="text-sm font-medium" style={{ color: item.color }}>{item.name}</div>
                  <div className="text-xl font-bold">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InvitedUserTasksChart;