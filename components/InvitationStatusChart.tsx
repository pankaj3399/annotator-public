import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, TooltipProps } from 'recharts';

interface InvitationCounts {
  accepted: number;
  pending: number;
  total: number;
}

interface InvitationStatusChartProps {
  counts: InvitationCounts;
}

interface DataItem {
  name: string;
  value: number;
  color: string;
}

interface LabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
  index: number;
  name: string;
}

// Custom tooltip props need to extend recharts TooltipProps
interface CustomTooltipProps extends TooltipProps<number, string> {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: DataItem;
  }>;
}

const InvitationStatusChart: React.FC<InvitationStatusChartProps> = ({ counts }) => {
  const [animationComplete, setAnimationComplete] = useState<boolean>(false);
  const [animationProgress, setAnimationProgress] = useState<number>(0);
  
  // Data for the donut chart
  const data: DataItem[] = [
    { name: 'Accepted', value: counts.accepted, color: '#10B981' }, // Vibrant green
    { name: 'Pending', value: counts.pending, color: '#F59E0B' }    // Vibrant yellow
  ];

  // Handle animation
  useEffect(() => {
    const duration = 1500;
    const interval = 16; // ~60fps
    const steps = duration / interval;
    let step = 0;
    
    const timer = setInterval(() => {
      step += 1;
      setAnimationProgress(step / steps);
      
      if (step >= steps) {
        clearInterval(timer);
        setAnimationComplete(true);
      }
    }, interval);
    
    return () => clearInterval(timer);
  }, []);

  // Custom Tooltip
  const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
    if (active && payload && payload.length && payload[0]) {
      const percentage = ((payload[0].value / counts.total) * 100).toFixed(1);
      return (
        <div className="bg-white p-4 border border-gray-200 shadow-lg rounded-lg">
          <p className="font-medium text-lg">{`${payload[0].name}`}</p>
          <p className="text-gray-800 font-bold">{`${payload[0].value} invitations`}</p>
          <p className="text-gray-600">{`${percentage}% of total`}</p>
        </div>
      );
    }
    return null;
  };

  // Animated percentage values
  const getAnimatedPercentage = (value: number): string => {
    if (counts.total === 0) return "0";
    const percentage = (value / counts.total) * 100;
    return animationComplete 
      ? percentage.toFixed(0) 
      : (percentage * animationProgress).toFixed(0);
  };

  // Custom label to show percentages
  const renderCustomizedLabel = (props: LabelProps): JSX.Element => {
    const { cx, cy, midAngle, innerRadius, outerRadius, index } = props;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor="middle" 
        dominantBaseline="central"
        className="text-lg font-bold"
      >
        {getAnimatedPercentage(data[index].value)}%
      </text>
    );
  };

  return (
    <div className="w-full">
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">Invitation Status</h2>
        <p className="text-gray-500 text-sm">Total: {counts.total} invitations</p>
      </div>
      
      <div className="w-full h-80 relative">
        {/* Center content */}
        <div className="absolute inset-0 flex items-center justify-center z-0">
          <div className="w-32 h-32 rounded-full bg-white shadow-lg flex items-center justify-center">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-800">{counts.total}</div>
              <div className="text-gray-500 text-sm">Total</div>
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
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={80}
              outerRadius={120}
              paddingAngle={4}
              dataKey="value"
              label={renderCustomizedLabel}
              labelLine={false}
              isAnimationActive={true}
              animationBegin={0}
              animationDuration={1500}
              animationEasing="ease-out"
              filter="url(#shadow)"
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color} 
                  stroke="white"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            
            <Tooltip content={<CustomTooltip />} />
            
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
        {data.map((item, index) => (
          <div 
            key={`stat-${index}`} 
            className="bg-white p-3 rounded-lg shadow-sm"
          >
            <div className="flex items-center mb-1">
              <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></div>
              <div className="text-sm font-medium">{item.name}</div>
            </div>
            <div className="text-xl font-bold">{item.value}</div>
            <div className="text-gray-500 text-xs">{getAnimatedPercentage(item.value)}% of total</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InvitationStatusChart;