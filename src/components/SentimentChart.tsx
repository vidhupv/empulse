'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
// Date utilities removed as we now fetch real data from API

interface SentimentData {
  date: string;
  sentiment: number;
  messageCount: number;
}

interface SentimentChartProps {
  timeframe: '7d' | '30d';
}

export default function SentimentChart({ timeframe }: SentimentChartProps) {
  const [data, setData] = useState<SentimentData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSentimentData();
  }, [timeframe]);

  const loadSentimentData = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/dashboard/data?type=sentiment&timeframe=${timeframe}`);
      const result = await response.json();
      
      if (response.ok && result.data) {
        setData(result.data);
      } else {
        // If no data available, show empty state
        setData([]);
      }
    } catch (error) {
      console.error('Error loading sentiment data:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          <p className="text-sm text-gray-600">
            Sentiment: <span className={`font-medium ${
              data.sentiment >= 0.6 ? 'text-green-600' : 
              data.sentiment >= 0.4 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {(data.sentiment * 100).toFixed(0)}%
            </span>
          </p>
          <p className="text-sm text-gray-600">
            Messages: <span className="font-medium">{data.messageCount}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-center">
        <div>
          <div className="text-gray-400 mb-2">📊</div>
          <p className="text-gray-600 font-medium">No sentiment data available</p>
          <p className="text-sm text-gray-500">Add messages to monitored channels to see trends</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            stroke="#666"
          />
          <YAxis 
            domain={[0, 1]}
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
            stroke="#666"
          />
          <Tooltip content={<CustomTooltip />} />
          <Line 
            type="monotone" 
            dataKey="sentiment" 
            stroke="#2563eb" 
            strokeWidth={2}
            dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#2563eb', strokeWidth: 2, fill: '#ffffff' }}
          />
        </LineChart>
      </ResponsiveContainer>
      
      <div className="mt-4 flex justify-center space-x-4 text-sm text-gray-600">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
          <span>Positive (60%+)</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
          <span>Neutral (40-60%)</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
          <span>Negative (&lt;40%)</span>
        </div>
      </div>
    </div>
  );
}