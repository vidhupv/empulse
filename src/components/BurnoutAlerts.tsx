'use client';

import { useState, useEffect } from 'react';
import { AlertTriangleIcon, ClockIcon, UserIcon } from 'lucide-react';

interface BurnoutAlert {
  id: string;
  channelId: string;
  channelName: string;
  riskLevel: 'low' | 'medium' | 'high';
  signals: string[];
  affectedUsers: number;
  detectedAt: string;
  severity: number; // 0-1 scale
}

export default function BurnoutAlerts() {
  const [alerts, setAlerts] = useState<BurnoutAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBurnoutAlerts();
  }, []);

  const loadBurnoutAlerts = async () => {
    try {
      setLoading(true);
      
      // For now, we'll use mock data since we haven't implemented the burnout detection API yet
      // TODO: Replace with actual API call to /api/burnout/alerts
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const mockAlerts: BurnoutAlert[] = [
        {
          id: '1',
          channelId: 'C1234567',
          channelName: 'dev-team',
          riskLevel: 'medium',
          signals: [
            'Multiple mentions of working late hours',
            'Increased use of stress-related language',
            'Decreased positive reactions to messages'
          ],
          affectedUsers: 3,
          detectedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          severity: 0.65
        },
        {
          id: '2',
          channelId: 'C7890123',
          channelName: 'product-team',
          riskLevel: 'low',
          signals: [
            'Slight increase in weekend activity',
            'Few mentions of tight deadlines'
          ],
          affectedUsers: 1,
          detectedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
          severity: 0.35
        }
      ];
      
      setAlerts(mockAlerts);
    } catch (error) {
      console.error('Error loading burnout alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRiskIcon = (level: string) => {
    const baseClasses = "w-5 h-5";
    switch (level) {
      case 'high': return <AlertTriangleIcon className={`${baseClasses} text-red-600`} />;
      case 'medium': return <AlertTriangleIcon className={`${baseClasses} text-yellow-600`} />;
      case 'low': return <AlertTriangleIcon className={`${baseClasses} text-blue-600`} />;
      default: return <AlertTriangleIcon className={`${baseClasses} text-gray-600`} />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours === 1) return '1 hour ago';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return '1 day ago';
    return `${diffInDays} days ago`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Burnout Alerts</h3>
          <p className="text-sm text-gray-600">Early warning system for team wellness</p>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Burnout Alerts</h3>
            <p className="text-sm text-gray-600">Early warning system for team wellness</p>
          </div>
          {alerts.length > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              {alerts.length} active alert{alerts.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
      
      <div className="p-6">
        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <AlertTriangleIcon className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">All Clear!</h4>
            <p className="text-gray-600">No burnout signals detected in monitored channels</p>
            <p className="text-sm text-gray-500 mt-2">
              The system continuously monitors for stress indicators, overtime mentions, and negative sentiment patterns
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div key={alert.id} className={`border rounded-lg p-4 ${getRiskLevelColor(alert.riskLevel)}`}>
                <div className="flex items-start space-x-3">
                  {getRiskIcon(alert.riskLevel)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-900">
                        #{alert.channelName}
                      </h4>
                      <div className="flex items-center space-x-2 text-xs text-gray-600">
                        <ClockIcon className="w-3 h-3" />
                        <span>{formatTimeAgo(alert.detectedAt)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 mb-3 text-sm text-gray-700">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getRiskLevelColor(alert.riskLevel)}`}>
                        {alert.riskLevel.toUpperCase()} RISK
                      </span>
                      <div className="flex items-center space-x-1">
                        <UserIcon className="w-3 h-3" />
                        <span>{alert.affectedUsers} user{alert.affectedUsers !== 1 ? 's' : ''} affected</span>
                      </div>
                      <span>{(alert.severity * 100).toFixed(0)}% severity</span>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-900 mb-1">Detected signals:</p>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {alert.signals.map((signal, index) => (
                          <li key={index} className="flex items-start space-x-1">
                            <span className="text-gray-400 mt-1">•</span>
                            <span>{signal}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-600">
                        <strong>Recommendation:</strong> Consider checking in with team members in this channel. 
                        {alert.riskLevel === 'high' && ' Immediate attention recommended.'}
                        {alert.riskLevel === 'medium' && ' Schedule regular 1:1s to understand workload.'}
                        {alert.riskLevel === 'low' && ' Monitor for trend changes.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertTriangleIcon className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900">How we detect burnout signals</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Our AI analyzes message content for stress indicators, work-life balance mentions, 
                    sentiment changes, and communication patterns to identify early warning signs of team burnout.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}