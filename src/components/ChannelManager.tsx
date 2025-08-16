'use client';

import { useState, useEffect } from 'react';
import { PlusIcon, XIcon, HashIcon } from 'lucide-react';

interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
  is_member: boolean;
}

interface ChannelManagerProps {
  onChannelsUpdated: () => void;
}

export default function ChannelManager({ onChannelsUpdated }: ChannelManagerProps) {
  const [showModal, setShowModal] = useState(false);
  const [availableChannels, setAvailableChannels] = useState<SlackChannel[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (showModal) {
      loadAvailableChannels();
    }
  }, [showModal]);

  const loadAvailableChannels = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/channels');
      const data = await response.json();
      
      if (response.ok) {
        // Filter out channels that are already monitored
        const monitoredChannelIds = new Set(data.monitored.map((c: any) => c.slackChannelId));
        const available = data.available.filter((c: SlackChannel) => !monitoredChannelIds.has(c.id));
        setAvailableChannels(available);
      } else {
        setError(data.error || 'Failed to load channels');
      }
    } catch (err) {
      setError('Failed to load channels');
      console.error('Error loading channels:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChannelToggle = (channelId: string) => {
    setSelectedChannels(prev => 
      prev.includes(channelId)
        ? prev.filter(id => id !== channelId)
        : [...prev, channelId]
    );
  };

  const handleAddChannels = async () => {
    if (selectedChannels.length === 0) return;

    try {
      setLoading(true);
      const response = await fetch('/api/channels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channelIds: selectedChannels,
          teamId: 'default',
          teamName: 'Default Team',
          addedBy: 'user'
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        // Check results for any errors
        const errors = data.results.filter((r: any) => r.status === 'error');
        if (errors.length > 0) {
          setError(`Some channels could not be added: ${errors.map((e: any) => e.error).join(', ')}`);
        } else {
          setShowModal(false);
          setSelectedChannels([]);
          onChannelsUpdated();
        }
      } else {
        setError(data.error || 'Failed to add channels');
      }
    } catch (err) {
      setError('Failed to add channels');
      console.error('Error adding channels:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <PlusIcon className="w-4 h-4 mr-2" />
        Add Channels
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Add Slack Channels</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XIcon className="w-6 h-6" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Select Slack channels to monitor for sentiment analysis. Make sure the EmPulse bot is added to these channels.
              </p>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">Loading channels...</p>
              </div>
            ) : (
              <>
                <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-md">
                  {availableChannels.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      No available channels found. Make sure the EmPulse bot is added to channels you want to monitor.
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {availableChannels.map((channel) => (
                        <label
                          key={channel.id}
                          className="flex items-center p-3 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedChannels.includes(channel.id)}
                            onChange={() => handleChannelToggle(channel.id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div className="ml-3 flex items-center">
                            <HashIcon className="w-4 h-4 text-gray-400 mr-1" />
                            <span className="text-sm font-medium text-gray-900">
                              {channel.name}
                            </span>
                            {channel.is_private && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                Private
                              </span>
                            )}
                            {!channel.is_member && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                Not a member
                              </span>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddChannels}
                    disabled={selectedChannels.length === 0 || loading}
                    className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Add {selectedChannels.length} Channel{selectedChannels.length !== 1 ? 's' : ''}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}