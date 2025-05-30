'use client';

import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from 'recharts';
import { Users, TrendingUp, Calendar, UserCheck, ChevronDown, ChevronUp } from 'lucide-react';

// Add shadcn components
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface RegistrationDataPoint {
  date: string;
  count: number;
  teamId: string;
  teamName: string;
}

interface TeamRegistrationData {
  teamId: string;
  teamName: string;
  daily: RegistrationDataPoint[];
  weekly: RegistrationDataPoint[];
  monthly: RegistrationDataPoint[];
  total: number;
}

interface RegistrationApiResponse {
  teams: TeamRegistrationData[];
  totalExperts: number;
  lastUpdated: string;
}

interface Team {
  _id: string;
  name: string;
  description?: string;
  members: string[];
  created_at: string;
}

interface TeamsApiResponse {
  teams: Team[];
  totalTeams: number;
}

const AdminDashboard = () => {
  const [registrationData, setRegistrationData] = useState<RegistrationApiResponse | null>(null);
  const [teamsData, setTeamsData] = useState<TeamsApiResponse | null>(null);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [timePeriod, setTimePeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch registration data
        const registrationResponse = await fetch(
          '/api/admin/dashboard?endpoint=registration-data'
        );
        if (!registrationResponse.ok) {
          throw new Error('Failed to fetch registration data');
        }
        const regData = await registrationResponse.json();
        setRegistrationData(regData);

        // Fetch teams data
        const teamsResponse = await fetch(
          '/api/admin/dashboard?endpoint=teams'
        );
        if (!teamsResponse.ok) {
          throw new Error('Failed to fetch teams data');
        }
        const teamData = await teamsResponse.json();
        setTeamsData(teamData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle team selection
  const handleTeamSelection = (teamId: string) => {
    if (teamId === 'all') {
      if (selectedTeams.includes('all')) {
        // If "All" is currently selected, deselect everything
        setSelectedTeams([]);
      } else {
        // Select all teams
        setSelectedTeams(['all']);
      }
    } else {
      setSelectedTeams((prev) => {
        // Remove 'all' if it's selected
        const filtered = prev.filter((id) => id !== 'all');
        
        if (filtered.includes(teamId)) {
          // Remove the team if it's already selected
          return filtered.filter((id) => id !== teamId);
        } else {
          // Add the team
          return [...filtered, teamId];
        }
      });
    }
  };

  // Process chart data based on selected teams and time period
  const getChartData = () => {
    if (!registrationData) return [];

    // If no teams selected or 'all' is selected, show all teams
    const shouldShowAllTeams = selectedTeams.length === 0 || selectedTeams.includes('all');
    
    if (shouldShowAllTeams) {
      // Aggregate data from all teams
      const allDates = new Set<string>();
      registrationData.teams.forEach((team) => {
        team[timePeriod].forEach((point) => allDates.add(point.date));
      });

      return Array.from(allDates)
        .sort()
        .map((date) => {
          const totalCount = registrationData.teams.reduce((sum, team) => {
            const point = team[timePeriod].find((p) => p.date === date);
            return sum + (point?.count || 0);
          }, 0);

          return { date, count: totalCount, teamName: 'All Teams' };
        });
    } else {
      // Aggregate data from selected teams
      const selectedTeamData = registrationData.teams.filter((team) =>
        selectedTeams.includes(team.teamId)
      );

      const allDates = new Set<string>();
      selectedTeamData.forEach((team) => {
        team[timePeriod].forEach((point) => allDates.add(point.date));
      });

      return Array.from(allDates)
        .sort()
        .map((date) => {
          const totalCount = selectedTeamData.reduce((sum, team) => {
            const point = team[timePeriod].find((p) => p.date === date);
            return sum + (point?.count || 0);
          }, 0);

          return { date, count: totalCount, teamName: 'Selected Teams' };
        });
    }
  };

  // Get team performance data
  const getTeamPerformanceData = () => {
    if (!registrationData) return [];

    const shouldShowAllTeams = selectedTeams.length === 0 || selectedTeams.includes('all');

    return registrationData.teams
      .map((team) => ({
        teamName: team.teamName,
        teamId: team.teamId,
        total: team.total,
        recent: team[timePeriod]
          .slice(-7)
          .reduce((sum, point) => sum + point.count, 0),
        isSelected: shouldShowAllTeams || selectedTeams.includes(team.teamId),
      }))
      .sort((a, b) => b.total - a.total);
  };

  // Get display text for selected teams
  const getSelectedTeamsDisplay = () => {
    if (!registrationData) return 'Loading...';
    
    if (selectedTeams.length === 0) {
      return 'No teams selected';
    }
    
    if (selectedTeams.includes('all')) {
      return 'All Teams';
    }
    
    if (selectedTeams.length === 1) {
      const team = registrationData.teams.find(t => t.teamId === selectedTeams[0]);
      return team?.teamName || 'Unknown Team';
    }
    
    return `${selectedTeams.length} teams selected`;
  };

  // Calculate dynamic width for horizontal scrolling
  const getChartWidth = () => {
    const chartData = getChartData();
    const baseWidth = 1200;
    const minPointWidth = timePeriod === 'daily' ? 20 : timePeriod === 'weekly' ? 35 : 60;
    const calculatedWidth = Math.max(baseWidth, chartData.length * minPointWidth);
    return calculatedWidth;
  };

  // Prettier pink, purple, red color gradients
  const teamColors = [
    'from-pink-400 to-rose-500',
    'from-purple-400 to-violet-500',
    'from-red-400 to-pink-500',
    'from-fuchsia-400 to-purple-500',
    'from-rose-400 to-red-500',
    'from-violet-400 to-fuchsia-500',
  ];

  if (loading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100 flex items-center justify-center'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-16 w-16 border-b-2 border-slate-500 mx-auto mb-4'></div>
          <p className='text-gray-600 text-lg'>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-gray-50 to-red-50 flex items-center justify-center'>
        <div className='bg-white rounded-lg p-8 shadow-lg max-w-md border border-gray-200'>
          <div className='text-red-600 text-center'>
            <h2 className='text-xl font-bold mb-2'>Error</h2>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const chartData = getChartData();
  const teamPerformanceData = getTeamPerformanceData();
  const totalRegistrations = chartData.reduce((sum, point) => sum + point.count, 0);
  const avgPerPeriod = totalRegistrations / (chartData.length || 1);

  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-blue-50'>
      <div className='container mx-auto px-6 py-8'>
        {/* Header */}
        <div className='mb-8'>
          <h1 className='text-4xl font-bold bg-gradient-to-r from-slate-700 to-slate-600 bg-clip-text text-transparent mb-2'>
            Expert Registration Analytics
          </h1>
          <p className='text-gray-600'>
            Monitor expert onboarding performance across all teams - Complete historical data
          </p>
        </div>

        {/* Controls */}
        <div className='bg-white/80 backdrop-blur-sm rounded-xl p-6 mb-8 shadow-sm border border-gray-200/50'>
          <div className='flex flex-wrap gap-4 items-center'>
            <div className='flex-1 min-w-48'>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Teams
              </label>
              <div className='relative'>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg bg-white/90 backdrop-blur-sm min-h-[40px] flex items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition-all'
                >
                  <div className='flex flex-wrap gap-1 items-center flex-1'>
                    {selectedTeams.length === 0 ? (
                      <span className='text-gray-500'>Select teams...</span>
                    ) : selectedTeams.includes('all') ? (
                      <span className='inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800'>
                        All Teams
                      </span>
                    ) : (
                      selectedTeams.map((teamId) => {
                        const team = registrationData?.teams.find(t => t.teamId === teamId);
                        return team ? (
                          <span
                            key={teamId}
                            className='inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-pink-100 text-pink-800'
                          >
                            {team.teamName}
                          </span>
                        ) : null;
                      })
                    )}
                  </div>
                  {isDropdownOpen ? (
                    <ChevronUp className='h-5 w-5 text-gray-400' />
                  ) : (
                    <ChevronDown className='h-5 w-5 text-gray-400' />
                  )}
                </button>

                {isDropdownOpen && (
                  <div className='absolute top-full left-0 right-0 mt-1 space-y-1 max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-white/95 backdrop-blur-sm p-2 shadow-lg z-10'>
                    <label className='flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer'>
                      <input
                        type='checkbox'
                        checked={selectedTeams.includes('all')}
                        onChange={() => handleTeamSelection('all')}
                        className='rounded text-purple-600 focus:ring-purple-500'
                      />
                      <span className='text-sm font-medium text-gray-700'>
                        All Teams
                      </span>
                    </label>
                    {registrationData?.teams.map((team) => (
                      <label
                        key={team.teamId}
                        className='flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer'
                      >
                        <input
                          type='checkbox'
                          checked={selectedTeams.includes(team.teamId)}
                          onChange={() => handleTeamSelection(team.teamId)}
                          className='rounded text-pink-600 focus:ring-pink-500'
                        />
                        <span className='text-sm text-gray-700'>
                          {team.teamName}
                        </span>
                        <span className='text-xs text-gray-500'>
                          ({team.total} experts)
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className='flex-1 min-w-48'>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Time Period
              </label>
              <select
                value={timePeriod}
                onChange={(e) =>
                  setTimePeriod(e.target.value as 'daily' | 'weekly' | 'monthly')
                }
                className='w-full px-4 py-2 border border-gray-300 rounded-lg bg-white/90 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition-all'
              >
                <option value='daily'>Daily</option>
                <option value='weekly'>Weekly</option>
                <option value='monthly'>Monthly</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'>
          <div className='bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl p-6 text-white shadow-sm border border-gray-200/20'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-purple-200 text-sm'>Total Experts</p>
                <p className='text-2xl font-bold'>
                  {registrationData?.totalExperts || 0}
                </p>
              </div>
              <Users className='h-8 w-8 text-purple-300' />
            </div>
          </div>

          <div className='bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl p-6 text-white shadow-sm border border-gray-200/20'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-pink-200 text-sm'>Active Teams</p>
                <p className='text-2xl font-bold'>
                  {teamsData?.totalTeams || 0}
                </p>
              </div>
              <UserCheck className='h-8 w-8 text-pink-300' />
            </div>
          </div>

          <div className='bg-gradient-to-br from-red-500 to-pink-600 rounded-xl p-6 text-white shadow-sm border border-gray-200/20'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-red-200 text-sm'>Period Total</p>
                <p className='text-2xl font-bold'>{totalRegistrations}</p>
              </div>
              <Calendar className='h-8 w-8 text-red-300' />
            </div>
          </div>

          <div className='bg-gradient-to-br from-fuchsia-500 to-purple-600 rounded-xl p-6 text-white shadow-sm border border-gray-200/20'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-fuchsia-200 text-sm'>
                  Average per {timePeriod.slice(0, -2)}
                </p>
                <p className='text-2xl font-bold'>{avgPerPeriod.toFixed(1)}</p>
              </div>
              <TrendingUp className='h-8 w-8 text-fuchsia-300' />
            </div>
          </div>
        </div>

        {/* Main Chart - Complete Data with Horizontal Scrolling */}
        <div className='bg-white/80 backdrop-blur-sm rounded-xl p-6 mb-8 shadow-sm border border-gray-200/50'>
          <div className='flex items-center justify-between mb-6'>
            <div>
              <h2 className='text-2xl font-bold text-gray-800'>
                Complete Registration Trends - {getSelectedTeamsDisplay()}
              </h2>
              <p className='text-sm text-gray-600 mt-1'>
                Showing all {chartData.length} data points • Scroll horizontally to explore complete timeline
              </p>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant='outline' size='sm'>
                  <TrendingUp className='h-4 w-4 mr-2' />
                  View Full Chart
                </Button>
              </DialogTrigger>
              <DialogContent className='max-w-6xl w-[95vw] max-h-[90vh]'>
                <DialogHeader>
                  <DialogTitle>Complete Expert Registration Trend</DialogTitle>
                  <DialogDescription>
                    All registration data over time for selected teams.
                  </DialogDescription>
                </DialogHeader>
                <Tabs
                  value={timePeriod}
                  onValueChange={(value) => setTimePeriod(value as 'daily' | 'weekly' | 'monthly')}
                  className='w-full mt-4'
                >
                  <TabsList className='grid w-full grid-cols-3'>
                    <TabsTrigger value='daily'>Daily</TabsTrigger>
                    <TabsTrigger value='weekly'>Weekly</TabsTrigger>
                    <TabsTrigger value='monthly'>Monthly</TabsTrigger>
                  </TabsList>
                </Tabs>
                <div className='mt-4 overflow-x-auto border border-gray-200 rounded-lg'>
                  <div style={{ width: getChartWidth(), height: 400 }}>
                    <ResponsiveContainer width='100%' height='100%'>
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id='colorGradient' x1='0' y1='0' x2='0' y2='1'>
                            <stop offset='5%' stopColor='#A855F7' stopOpacity={0.6} />
                            <stop offset='95%' stopColor='#A855F7' stopOpacity={0.1} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray='3 3' className='opacity-20' />
                        <XAxis
                          dataKey='date'
                          className='text-sm'
                          tick={{ fontSize: 12, fill: '#64748B' }}
                          interval={Math.max(0, Math.floor(chartData.length / 25))}
                          angle={-45}
                          textAnchor='end'
                          height={80}
                        />
                        <YAxis
                          className='text-sm'
                          tick={{ fontSize: 12, fill: '#64748B' }}
                        />
                        <Tooltip 
                          formatter={(value: number) => [value, 'Registrations']}
                          labelFormatter={(label) => `Date: ${label}`}
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                          }}
                        />
                        <Area
                          type='monotone'
                          dataKey='count'
                          stroke='#A855F7'
                          strokeWidth={2}
                          fill='url(#colorGradient)'
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className='overflow-x-auto border border-gray-200 rounded-lg'>
            <div style={{ width: getChartWidth(), height: 300 }}>
              <ResponsiveContainer width='100%' height='100%'>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id='previewGradient' x1='0' y1='0' x2='0' y2='1'>
                      <stop offset='5%' stopColor='#A855F7' stopOpacity={0.4} />
                      <stop offset='95%' stopColor='#A855F7' stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray='3 3' className='opacity-20' />
                  <XAxis
                    dataKey='date'
                    className='text-sm'
                    tick={{ fontSize: 10, fill: '#64748B' }}
                    interval={Math.max(0, Math.floor(chartData.length / 15))}
                    angle={-45}
                    textAnchor='end'
                    height={60}
                  />
                  <YAxis
                    className='text-sm'
                    tick={{ fontSize: 10, fill: '#64748B' }}
                  />
                  <Tooltip 
                    formatter={(value: number) => [value, 'Registrations']}
                    labelFormatter={(label) => `Date: ${label}`}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <Area
                    type='monotone'
                    dataKey='count'
                    stroke='#A855F7'
                    strokeWidth={2}
                    fill='url(#previewGradient)'
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Team Performance */}
        <div className='bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-gray-200/50'>
          <h2 className='text-2xl font-bold text-gray-800 mb-6'>
            Team Performance Overview
          </h2>

          <div className='grid grid-cols-1 gap-8'>
            {/* Team Rankings */}
            <div>
              <h3 className='text-lg font-semibold text-gray-700 mb-4'>
                Total Experts by Team
              </h3>
              <div className='space-y-3'>
                {teamPerformanceData.map((team, index) => (
                  <div
                    key={team.teamName}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                      team.isSelected
                        ? 'bg-gradient-to-r from-pink-50 to-purple-50 border-pink-200 shadow-sm'
                        : 'bg-white/60 border-gray-100'
                    }`}
                    onClick={() => handleTeamSelection(team.teamId)}
                  >
                    <div className='flex items-center space-x-3'>
                      <div
                        className={`w-3 h-3 rounded-full bg-gradient-to-r ${teamColors[index % teamColors.length]} ${
                          team.isSelected ? 'ring-2 ring-pink-200' : ''
                        }`}
                      ></div>
                      <span
                        className={`font-medium ${team.isSelected ? 'text-gray-800' : 'text-gray-700'}`}
                      >
                        {team.teamName}
                        {team.isSelected && !selectedTeams.includes('all') && selectedTeams.length > 0 && (
                          <span className='ml-2 text-xs text-pink-600'>
                            ✓ Selected
                          </span>
                        )}
                      </span>
                    </div>
                    <div className='text-right'>
                      <div
                        className={`text-lg font-bold ${team.isSelected ? 'text-gray-900' : 'text-gray-800'}`}
                      >
                        {team.total}
                      </div>
                      <div className='text-xs text-gray-500'>experts</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity Chart */}
            <div>
              <h3 className='text-lg font-semibold text-gray-700 mb-4'>
                Recent Activity (Last 7 periods) - {getSelectedTeamsDisplay()}
              </h3>
              <div className='h-64'>
                <ResponsiveContainer width='100%' height='100%'>
                  <BarChart data={teamPerformanceData.filter((team) => team.isSelected)}>
                    <CartesianGrid strokeDasharray='3 3' className='opacity-20' />
                    <XAxis
                      dataKey='teamName'
                      angle={-45}
                      textAnchor='end'
                      height={60}
                      className='text-xs'
                      tick={{ fontSize: 10, fill: '#64748B' }}
                    />
                    <YAxis
                      className='text-sm'
                      tick={{ fontSize: 12, fill: '#64748B' }}
                    />
                    <Tooltip
                      formatter={(value: number) => [value, 'Recent Registrations']}
                      labelFormatter={(label) => `Team: ${label}`}
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                      }}
                    />
                    <Bar dataKey='recent' fill='url(#barGradient)' radius={[4, 4, 0, 0]} />
                    <defs>
                      <linearGradient id='barGradient' x1='0' y1='0' x2='0' y2='1'>
                        <stop offset='5%' stopColor='#EC4899' stopOpacity={0.7} />
                        <stop offset='95%' stopColor='#EC4899' stopOpacity={0.3} />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;