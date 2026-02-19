'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { 
  TrendingUp, 
  Activity, 
  Calendar,
  Users,
  BarChart3,
  User
} from 'lucide-react';

interface ClientProgressData {
  clientId: string;
  clientName: string;
  data: Array<{
    date: string;
    weight?: number;
    bodyFat?: number;
    muscleMass?: number;
    mood?: number;
    energy?: number;
    workoutVolume?: number;
    strengthGain?: number;
  }>;
}

interface TrainerProgressProps {
  selectedClientId?: string | null;
  clients: Array<{ id: string; name: string; email: string }>;
}

const TrainerProgressCharts: React.FC<TrainerProgressProps> = ({ 
  selectedClientId, 
  clients 
}) => {
  const [progressData, setProgressData] = useState<ClientProgressData[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState('line');
  const [selectedMetric, setSelectedMetric] = useState('weight');
  const [viewMode, setViewMode] = useState<'individual' | 'comparison'>('individual');

  const fetchProgressData = useCallback(async () => {
    setLoading(true);
    try {
      // If a specific client is selected, fetch only their data
      if (selectedClientId) {
        const response = await fetch(`/api/progress-analytics?clientId=${selectedClientId}`);
        const data = await response.json();
        
        if (response.ok && data.monthlyStats) {
          const client = clients.find(c => c.id === selectedClientId);
          setProgressData([{
            clientId: selectedClientId,
            clientName: client?.name || 'Unknown Client',
            data: data.monthlyStats || []
          }]);
        } else {
          setProgressData([]);
        }
      } else {
        // Fetch data for all clients
        const clientsData = await Promise.all(
          clients.map(async (client) => {
            try {
              const response = await fetch(`/api/progress-analytics?clientId=${client.id}`);
              const data = await response.json();
              
              return {
                clientId: client.id,
                clientName: client.name,
                data: (response.ok && data.monthlyStats) ? data.monthlyStats : []
              };
            } catch (error) {
              console.error(`Error fetching data for ${client.name}:`, error);
              return {
                clientId: client.id,
                clientName: client.name,
                data: []
              };
            }
          })
        );
        setProgressData(clientsData.filter(client => client.data.length > 0));
      }
    } catch (error) {
      console.error('Error fetching progress data:', error);
      setProgressData([]);
    } finally {
      setLoading(false);
    }
  }, [selectedClientId, clients]);

  useEffect(() => {
    fetchProgressData();
  }, [fetchProgressData]);

  const getMetricValue = (dataPoint: Record<string, unknown>, metric: string): number | null => {
    const value = dataPoint[metric];
    return typeof value === 'number' ? value : null;
  };

  const getMetricLabel = (metric: string) => {
    switch (metric) {
      case 'weight': return 'Weight (lbs)';
      case 'bodyFat': return 'Body Fat (%)';
      case 'muscleMass': return 'Muscle Mass (lbs)';
      case 'mood': return 'Mood (1-10)';
      case 'energy': return 'Energy (1-10)';
      case 'workoutVolume': return 'Workout Volume';
      case 'strengthGain': return 'Strength Gain (%)';
      default: return 'Weight (lbs)';
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      // Handle both month format (2024-01) and date format (2024-01-15)
      if (dateStr.includes('-') && dateStr.split('-').length === 2) {
        const [year, month] = dateStr.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      } else {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    } catch {
      return dateStr;
    }
  };

  // Calculate month-to-month change for a client's metric
  const calculateMetricChange = (clientData: Array<Record<string, unknown>>, metric: string) => {
    if (!clientData || clientData.length < 2) return null;
    const current = getMetricValue(clientData[clientData.length - 1], metric);
    const previous = getMetricValue(clientData[clientData.length - 2], metric);
    if (current === null || previous === null) return null;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  const getMetricColor = (clientIndex: number) => {
    const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];
    return colors[clientIndex % colors.length];
  };

  // Prepare data for charts
  const prepareChartData = () => {
    if (progressData.length === 0) return [];

    // For individual client view
    if (selectedClientId && progressData.length === 1) {
      return progressData[0].data.map(item => ({
        date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        [selectedMetric]: getMetricValue(item, selectedMetric),
        clientName: progressData[0].clientName
      }));
    }

    // For comparison view (all clients)
    const allDates = [...new Set(
      progressData.flatMap(client => 
        client.data.map(item => item.date)
      )
    )].sort();

    return allDates.map(date => {
      const dataPoint: Record<string, unknown> = {
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      };

      progressData.forEach((client) => {
        const clientData = client.data.find(item => item.date === date);
        dataPoint[client.clientName] = clientData ? getMetricValue(clientData, selectedMetric) : null;
      });

      return dataPoint;
    });
  };

  const chartData = prepareChartData();

  const renderChart = () => {
    if (chartData.length === 0) {
      return (
        <div className="flex items-center justify-center h-96 text-gray-500">
          <div className="text-center">
            <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium">No Progress Data Available</p>
            <p className="text-sm">Start tracking progress to see charts here.</p>
          </div>
        </div>
      );
    }

    const Chart = chartType === 'area' ? AreaChart : chartType === 'bar' ? BarChart : LineChart;

    return (
      <ResponsiveContainer width="100%" height={400}>
        <Chart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12, fill: '#000000', fontWeight: 500 }}
            stroke="#000000"
            tickFormatter={formatDate}
          />
          <YAxis 
            tick={{ fontSize: 12, fill: '#000000', fontWeight: 500 }}
            stroke="#000000"
            label={{ value: getMetricLabel(selectedMetric), angle: -90, position: 'insideLeft', style: { fill: '#000000', fontWeight: 500 } }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb', 
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              color: '#000000',
              fontWeight: '500'
            }}
          />
          <Legend />
          
          {selectedClientId && progressData.length === 1 ? (
            // Single client chart
            chartType === 'area' ? (
              <Area
                type="monotone"
                dataKey={selectedMetric}
                stroke={getMetricColor(0)}
                fill={getMetricColor(0)}
                fillOpacity={0.3}
                strokeWidth={3}
                dot={{ fill: getMetricColor(0), strokeWidth: 2, r: 4 }}
                name={progressData[0].clientName}
              />
            ) : chartType === 'bar' ? (
              <Bar
                dataKey={selectedMetric}
                fill={getMetricColor(0)}
                name={progressData[0].clientName}
                radius={[4, 4, 0, 0]}
              />
            ) : (
              <Line
                type="monotone"
                dataKey={selectedMetric}
                stroke={getMetricColor(0)}
                strokeWidth={3}
                dot={{ fill: getMetricColor(0), strokeWidth: 2, r: 4 }}
                name={progressData[0].clientName}
              />
            )
          ) : (
            // Multiple clients comparison
            progressData.map((client, index) => {
              const color = getMetricColor(index);
              return chartType === 'area' ? (
                <Area
                  key={client.clientId}
                  type="monotone"
                  dataKey={client.clientName}
                  stroke={color}
                  fill={color}
                  fillOpacity={0.2}
                  strokeWidth={2}
                  dot={{ fill: color, strokeWidth: 2, r: 3 }}
                />
              ) : chartType === 'bar' ? (
                <Bar
                  key={client.clientId}
                  dataKey={client.clientName}
                  fill={color}
                  radius={[2, 2, 0, 0]}
                />
              ) : (
                <Line
                  key={client.clientId}
                  type="monotone"
                  dataKey={client.clientName}
                  stroke={color}
                  strokeWidth={2}
                  dot={{ fill: color, strokeWidth: 2, r: 3 }}
                />
              );
            })
          )}
        </Chart>
      </ResponsiveContainer>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-1/4 mb-4"></div>
          <div className="h-96 bg-gray-300 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Chart Controls */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Client Progress Analytics
          </h3>
          
          <div className="flex flex-wrap gap-3">
            {/* Metric Selector */}
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white text-black"
            >
              <option value="weight">Weight</option>
              <option value="bodyFat">Body Fat</option>
              <option value="muscleMass">Muscle Mass</option>
              <option value="mood">Mood</option>
              <option value="energy">Energy</option>
              <option value="workoutVolume">Workout Volume</option>
              <option value="strengthGain">Strength Gain</option>
            </select>

            {/* Chart Type Selector */}
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white text-black"
            >
              <option value="line">Line Chart</option>
              <option value="area">Area Chart</option>
              <option value="bar">Bar Chart</option>
            </select>

            {/* View Mode Toggle */}
            {!selectedClientId && progressData.length > 1 && (
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('individual')}
                  className={`px-3 py-2 text-sm font-medium ${
                    viewMode === 'individual'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <User className="h-4 w-4 inline mr-1" />
                  Individual
                </button>
                <button
                  onClick={() => setViewMode('comparison')}
                  className={`px-3 py-2 text-sm font-medium ${
                    viewMode === 'comparison'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Users className="h-4 w-4 inline mr-1" />
                  Compare
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Progress Summary Cards */}
        {progressData.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-blue-900">Clients Tracking</h4>
                <Users className="h-4 w-4 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-900">{progressData.length}</p>
              <p className="text-xs text-blue-600">out of {clients.length} total</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-green-900">Avg Progress</h4>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-900">
                {progressData.length > 0 ? 
                  (progressData.reduce((acc, client) => {
                    const latestData = client.data[client.data.length - 1];
                    const firstData = client.data[0];
                    if (latestData && firstData) {
                      const latest = getMetricValue(latestData, selectedMetric);
                      const first = getMetricValue(firstData, selectedMetric);
                      if (latest !== null && first !== null) {
                        const change = latest - first;
                        return acc + change;
                      }
                    }
                    return acc;
                  }, 0) / progressData.length).toFixed(1) : '0.0'
                }
              </p>
              <p className="text-xs text-green-600">{getMetricLabel(selectedMetric)} change</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-purple-900">Total Entries</h4>
                <Activity className="h-4 w-4 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-purple-900">
                {progressData.reduce((acc, client) => acc + client.data.length, 0)}
              </p>
              <p className="text-xs text-purple-600">across all clients</p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-orange-900">Time Period</h4>
                <Calendar className="h-4 w-4 text-orange-600" />
              </div>
              <p className="text-2xl font-bold text-orange-900">
                {progressData.length > 0 ? 
                  Math.max(...progressData.map(client => client.data.length)) : 0
                }
              </p>
              <p className="text-xs text-orange-600">max months tracked</p>
            </div>
          </div>
        )}

        {/* Main Chart */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${selectedMetric}-${chartType}-${selectedClientId}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-gray-50 rounded-lg p-4"
          >
            {renderChart()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Client Breakdown Table */}
      {progressData.length > 1 && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Client Progress Breakdown</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Client</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Entries</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">First Entry</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Latest Entry</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Progress</th>
                </tr>
              </thead>
              <tbody>
                {progressData.map((client, index) => {
                  const latestData = client.data[client.data.length - 1];
                  const firstData = client.data[0];
                  
                  let progress = 'N/A';
                  if (latestData && firstData) {
                    const latest = getMetricValue(latestData, selectedMetric);
                    const first = getMetricValue(firstData, selectedMetric);
                    if (latest !== null && first !== null) {
                      progress = (latest - first).toFixed(1);
                    }
                  }
                  
                  return (
                    <tr key={client.clientId} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: getMetricColor(index) }}
                          ></div>
                          <span className="font-medium text-gray-900">{client.clientName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{client.data.length}</td>
                      <td className="py-3 px-4 text-gray-600">
                        {firstData ? new Date(firstData.date).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {latestData ? new Date(latestData.date).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className={`py-3 px-4 font-medium ${
                        progress !== 'N/A' && parseFloat(progress) > 0 ? 'text-green-600' :
                        progress !== 'N/A' && parseFloat(progress) < 0 ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {progress !== 'N/A' ? `${parseFloat(progress) > 0 ? '+' : ''}${progress}` : 'N/A'} 
                        {progress !== 'N/A' && ` ${getMetricLabel(selectedMetric).split('(')[1]?.replace(')', '') || ''}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default TrainerProgressCharts;