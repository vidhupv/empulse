'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';

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
      
      // For now, we'll generate mock data since we haven't implemented the aggregation API yet
      // TODO: Replace with actual API call
      const days = timeframe === '7d' ? 7 : 30;
      const mockData: SentimentData[] = [];
      
      for (let i = days - 1; i >= 0; i--) {
        const date = startOfDay(subDays(new Date(), i));
        
        // Generate realistic mock sentiment data
        const baseScore = 0.6 + (Math.random() - 0.5) * 0.3; // 0.45 - 0.75 range
        const weekdayBoost = date.getDay() >= 1 && date.getDay() <= 5 ? 0.05 : -0.1; // Weekdays slightly better
        const mondayDip = date.getDay() === 1 ? -0.05 : 0; // Monday blues
        const fridayBoost = date.getDay() === 5 ? 0.1 : 0; // Friday happiness
        
        const sentiment = Math.max(0.1, Math.min(0.9, baseScore + weekdayBoost + mondayDip + fridayBoost));
        const messageCount = Math.floor(Math.random() * 50) + 10; // 10-60 messages
        
        mockData.push({
          date: format(date, 'MMM dd'),
          sentiment: Number(sentiment.toFixed(2)),
          messageCount
        });
      }
      
      setData(mockData);
    } catch (error) {
      console.error('Error loading sentiment data:', error);
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