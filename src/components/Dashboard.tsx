'use client';

import { useState, useEffect } from 'react';
import { Activity as PulseIcon, TrendingUp as TrendingUpIcon, TrendingDown as TrendingDownIcon } from 'lucide-react';
import ChannelManager from './ChannelManager';
import SentimentChart from './SentimentChart';
import WeeklyInsights from './WeeklyInsights';
import BurnoutAlerts from './BurnoutAlerts';

interface ChannelStats {
  _id: string;
  name: string;
  stats: {
    avgDailySentiment: number;
    totalMessages: number;
    lastWeekTrend: 'improving' | 'stable' | 'declining';
  };
  lastMessageAt?: string;
}

export default function Dashboard() {
  const [monitoredChannels, setMonitoredChannels] = useState<ChannelStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'7d' | '30d'>('7d');

  useEffect(() => {
    loadChannels();
  }, []);

  const loadChannels = async () => {
    try {
      const response = await fetch('/api/channels');
      const data = await response.json();
      setMonitoredChannels(data.monitored || []);
    } catch (error) {
      console.error('Error loading channels:', error);
    } finally {
      setLoading(false);
    }
  };

  const overallSentiment = monitoredChannels.length > 0 
    ? monitoredChannels.reduce((sum, channel) => sum + channel.stats.avgDailySentiment, 0) / monitoredChannels.length
    : 0.5;

  const totalMessages = monitoredChannels.reduce((sum, channel) => sum + channel.stats.totalMessages, 0);

  const improvingChannels = monitoredChannels.filter(c => c.stats.lastWeekTrend === 'improving').length;
  const decliningChannels = monitoredChannels.filter(c => c.stats.lastWeekTrend === 'declining').length;

  const getSentimentColor = (sentiment: number) => {
    if (sentiment >= 0.6) return 'text-green-600';
    if (sentiment >= 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSentimentLabel = (sentiment: number) => {
    if (sentiment >= 0.6) return 'Positive';
    if (sentiment >= 0.4) return 'Neutral';
    return 'Negative';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <PulseIcon className="w-12 h-12 text-blue-600 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <PulseIcon className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">EmPulse</h1>
              <span className="text-sm text-gray-500">Employee Engagement Dashboard</span>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(e.target.value as '7d' | '30d')}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {monitoredChannels.length === 0 ? (
          <div className="text-center py-12">
            <PulseIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Welcome to EmPulse</h2>
            <p className="text-gray-600 mb-6">Start monitoring team sentiment by adding Slack channels below</p>
            <ChannelManager onChannelsUpdated={loadChannels} />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">Overall Sentiment</p>
                    <p className={`text-2xl font-bold ${getSentimentColor(overallSentiment)}`}>
                      {getSentimentLabel(overallSentiment)}
                    </p>
                    <p className="text-xs text-gray-500">{(overallSentiment * 100).toFixed(1)}% score</p>
                  </div>
                  <div className={`p-3 rounded-full ${overallSentiment >= 0.6 ? 'bg-green-100' : overallSentiment >= 0.4 ? 'bg-yellow-100' : 'bg-red-100'}`}>
                    <PulseIcon className={`w-6 h-6 ${getSentimentColor(overallSentiment)}`} />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">Monitored Channels</p>
                    <p className="text-2xl font-bold text-gray-900">{monitoredChannels.length}</p>
                    <p className="text-xs text-gray-500">{totalMessages} total messages</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-full">
                    <PulseIcon className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">Improving Trends</p>
                    <p className="text-2xl font-bold text-green-600">{improvingChannels}</p>
                    <p className="text-xs text-gray-500">channels trending up</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-full">
                    <TrendingUpIcon className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">Declining Trends</p>
                    <p className="text-2xl font-bold text-red-600">{decliningChannels}</p>
                    <p className="text-xs text-gray-500">channels need attention</p>
                  </div>
                  <div className="p-3 bg-red-100 rounded-full">
                    <TrendingDownIcon className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Charts and Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Sentiment Trends</h3>
                  <p className="text-sm text-gray-600">Daily sentiment across all monitored channels</p>
                </div>
                <div className="p-6">
                  <SentimentChart timeframe={selectedTimeframe} />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Weekly Insights</h3>
                  <p className="text-sm text-gray-600">AI-generated team recommendations</p>
                </div>
                <div className="p-6">
                  <WeeklyInsights />
                </div>
              </div>
            </div>

            {/* Channel Details */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Channel Overview</h3>
                    <p className="text-sm text-gray-600">Sentiment status for each monitored channel</p>
                  </div>
                  <ChannelManager onChannelsUpdated={loadChannels} />
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {monitoredChannels.map((channel) => (
                    <div key={channel._id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">#{channel.name}</h4>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          channel.stats.lastWeekTrend === 'improving' 
                            ? 'bg-green-100 text-green-800'
                            : channel.stats.lastWeekTrend === 'declining'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {channel.stats.lastWeekTrend}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Sentiment:</span>
                          <span className={getSentimentColor(channel.stats.avgDailySentiment)}>
                            {getSentimentLabel(channel.stats.avgDailySentiment)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Messages:</span>
                          <span className="text-gray-900">{channel.stats.totalMessages}</span>
                        </div>
                        {channel.lastMessageAt && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Last activity:</span>
                            <span className="text-gray-900">
                              {new Date(channel.lastMessageAt).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Burnout Alerts */}
            <BurnoutAlerts />
          </div>
        )}
      </main>
    </div>
  );
}