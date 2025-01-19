import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface PersonalProgressChartProps {
  taskStatuses: string[];
  totalTasks: number;
  completionRate: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function PersonalProgressChartComponent({
  taskStatuses,
  totalTasks,
  completionRate
}: PersonalProgressChartProps) {
  // Count occurrences of each status
  const statusCount = taskStatuses.reduce((acc: { [key: string]: number }, status) => {
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  // Convert to data format required by PieChart
  const data = Object.entries(statusCount).map(([status, count]) => ({
    name: status,
    value: count
  }));

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Personal Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius="80%"
                fill="#8884d8"
                dataKey="value"
                // label={({
                //   cx,
                //   cy,
                //   midAngle,
                //   innerRadius,
                //   outerRadius,
                //   value,
                //   index
                // }) => {
                //   const RADIAN = Math.PI / 180;
                //   const radius = 25 + innerRadius + (outerRadius - innerRadius);
                //   const x = cx + radius * Math.cos(-midAngle * RADIAN);
                //   const y = cy + radius * Math.sin(-midAngle * RADIAN);

                //   return (
                //     <text
                //       x={x}
                //       y={y}
                //       fill="#666"
                //       textAnchor={x > cx ? 'start' : 'end'}
                //       dominantBaseline="central"
                //     >
                //       {`${data[index].name} (${value})`}
                //     </text>
                //   );
                // }}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            Total Tasks: {totalTasks}
          </p>
          <p className="text-sm text-gray-600">
            Completion Rate: {Math.round(completionRate)}%
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
