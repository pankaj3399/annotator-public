'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
// *** Import necessary date-fns functions ***
import { format, parse, parseISO, isValid } from 'date-fns';
import Loader from '../ui/NewLoader/Loader';

type Granularity = 'daily' | 'weekly' | 'monthly';

interface ChartDataPoint {
  date: string; // 'YYYY-MM-DD', 'YYYY-Www', or 'YYYY-MM'
  newExperts: number;
  cumulativeExperts: number;
}

interface UserActivityChartProps {
  data: ChartDataPoint[];
  isLoading: boolean;
  error: string | null;
  granularity: Granularity; // Receive granularity
}

// Helper to format axis/tooltip labels
const formatLabel = (label: string | undefined | null, granularity: Granularity): string => {
    // Add check for undefined/null label
    if (label == null || typeof label !== 'string') {
        console.warn("formatLabel received invalid label:", label);
        return ''; // Return empty string or some placeholder
    }

    try {
        switch (granularity) {
            case 'weekly':
                // label should be 'YYYY-Www'
                if (!label.includes('-W')) {
                     console.warn(`formatLabel (weekly): Invalid label format "${label}"`);
                     return label; // Return original label if format is wrong
                }
                const parts = label.split('-W');
                if (parts.length !== 2) {
                     console.warn(`formatLabel (weekly): Could not split label "${label}" correctly`);
                    return label;
                }
                const [yearW, weekStr] = parts;
                const weekNum = parseInt(weekStr, 10);
                if (isNaN(weekNum)) {
                     console.warn(`formatLabel (weekly): Could not parse week number from "${weekStr}" in label "${label}"`);
                     return label;
                }
                // *** Return the simple formatted string directly ***
                // This avoids any date parsing/formatting functions for the week label itself
                return `Week ${weekNum}, ${yearW}`;

            case 'monthly':
                // label is 'YYYY-MM'
                const dateM = parse(label, 'yyyy-MM', new Date());
                 // Check if parsing was successful before formatting
                 if (!isValid(dateM)) {
                     console.warn(`formatLabel (monthly): Could not parse date from "${label}"`);
                     return label;
                 }
                return format(dateM, 'MMM yyyy'); // e.g., "Jul 2024"

            case 'daily':
            default:
                // label is 'YYYY-MM-DD'
                const dateD = parseISO(label); // parseISO handles 'YYYY-MM-DD'
                 // Check if parsing was successful before formatting
                 if (!isValid(dateD)) {
                    console.warn(`formatLabel (daily): Could not parse date from "${label}"`);
                     return label;
                 }
                return format(dateD, 'MMM d, yyyy'); // e.g., "Jul 30, 2024"
        }
    } catch (e) {
        // Log the error with more context
        console.error(`Error formatting label: "${label}" with granularity "${granularity}"`, e);
        return label; // Fallback to original label on any unexpected error
    }
};


// Ensure the export name matches how you import it in AnnotatorsPage.tsx
export function DailyExpertsStats({ data, isLoading, error, granularity }: UserActivityChartProps) {
  if (isLoading) {
    return <Loader/>;
  }

  if (error) {
    // Display the specific error message
    return <div className="flex flex-col justify-center items-center h-64 text-red-600 text-center px-4">
        <p className="font-semibold mb-2">Error loading chart:</p>
        <p className="text-sm">{error}</p>
    </div>;
  }

  if (!data || data.length === 0) {
    return <div className="flex justify-center items-center h-64 text-gray-500">No data available for the selected period and filters.</div>;
  }

  // Defensive check for data format (optional but good practice)
  const validData = data.filter(dp => dp && typeof dp.date === 'string');
  if (validData.length !== data.length) {
      console.warn("Chart received some invalid data points.");
      // Optionally display a different message or just proceed with valid data
  }
  if (validData.length === 0 && data.length > 0) {
       return <div className="flex justify-center items-center h-64 text-orange-500">Chart data format seems invalid.</div>;
  }


  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart
        // Use only the validated data
        data={validData}
        margin={{ top: 5, right: 30, left: 20, bottom: 30 }} // Increased bottom margin more
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0"/> {/* Lighter grid */}
        <XAxis
           dataKey="date"
           // Pass the validated label to the formatter
           tickFormatter={(label) => formatLabel(label, granularity)}
           angle={validData.length > 12 ? -45 : 0} // Adjust angle trigger point
           textAnchor={validData.length > 12 ? "end" : "middle"}
           height={50} // Explicit height for angled labels
           interval={"preserveStartEnd"} // Show first/last, let recharts decide others
           minTickGap={15} // Increase gap slightly
           tick={{ fontSize: 11, fill: '#666' }} // Style ticks
         />
        <YAxis
            yAxisId="left"
            label={{ value: 'Count', angle: -90, position: 'insideLeft', fill: '#666', fontSize: 12 }}
            tick={{ fontSize: 11, fill: '#666' }}
            allowDecimals={false} // Ensure integer ticks
        />
        <Tooltip
            // Pass the validated label to the formatter
            labelFormatter={(label) => formatLabel(label, granularity)}
            contentStyle={{ fontSize: 12, borderRadius: '4px', boxShadow: '1px 1px 5px rgba(0,0,0,0.1)' }}
        />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: '10px' }} />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="newExperts"
          name={`New Experts (${granularity})`}
          stroke="#3b82f6" // Blue color
          strokeWidth={2}
          activeDot={{ r: 6, fill: '#3b82f6' }}
          dot={validData.length < 60 ? { r: 3, fill: '#3b82f6' } : false} // Smaller dots or none
        />
        <Line
           yAxisId="left"
          type="monotone"
          dataKey="cumulativeExperts"
          name="Total Experts" // Simpler name
          stroke="#10b981" // Green color
          strokeWidth={2}
          activeDot={{ r: 6, fill: '#10b981' }}
          dot={validData.length < 60 ? { r: 3, fill: '#10b981' } : false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}