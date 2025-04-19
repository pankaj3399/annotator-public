'use client';

import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ReadyWorkDataPoint {
    name: 'Active' | 'Not Active';
    value: number;
}

interface ReadyToWorkChartProps {
  data: ReadyWorkDataPoint[];
  isLoading: boolean;
  error: string | null;
}

const COLORS = ['#10b981', '#f87171']; // Green for Ready, Red for Not Ready

// Custom label renderer for percentages
const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }: any): React.ReactNode => {
    if (!percent || percent < 0.03) return null; // Don't render label for very small slices

    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
        <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12} fontWeight="medium">
        {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

export function ActiveUsersChart({ data, isLoading, error }: ReadyToWorkChartProps) {
    if (isLoading) {
        return <div className="flex justify-center items-center h-64 text-gray-500 animate-pulse">Loading readiness data...</div>;
    }

    if (error) {
        return <div className="flex flex-col justify-center items-center h-64 text-red-600 text-center px-4">
            <p className="font-semibold mb-2">Error loading chart:</p>
            <p className="text-sm">{error}</p>
        </div>;
    }

    const total = data.reduce((sum, entry) => sum + entry.value, 0);

    if (!data || data.length === 0 || total === 0) {
        return <div className="flex justify-center items-center h-64 text-gray-500">No annotators found matching filters to display readiness.</div>;
    }

    return (
        <ResponsiveContainer width="100%" height={350}>
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={120} // Adjust size as needed
                    innerRadius={60} // Make it a donut chart
                    fill="#8884d8"
                    dataKey="value"
                    paddingAngle={2} // Small gap between slices
                >
                {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
                </Pie>
                <Tooltip
                     formatter={(value: number, name: string) => [`${value} annotator(s)`, name]}
                     contentStyle={{ fontSize: 12, borderRadius: '4px', boxShadow: '1px 1px 5px rgba(0,0,0,0.1)' }}
                />
                <Legend
                    iconType="circle"
                    iconSize={10}
                    wrapperStyle={{ fontSize: 12, paddingTop: '15px' }}
                    formatter={(value, entry) => {
                         const { color } = entry;
                         const count = entry.payload?.value ?? 0;
                         return <span style={{ color }}>{`${value} (${count})`}</span>;
                     }}
                />
            </PieChart>
        </ResponsiveContainer>
    );
}