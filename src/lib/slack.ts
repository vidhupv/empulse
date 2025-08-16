import { App } from '@slack/bolt';
import { WebClient } from '@slack/web-api';

// Initialize Slack app
export const slackApp = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: false, // We'll use HTTP mode for webhooks
});

// Initialize Slack Web API client
export const slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);

export interface SlackMessage {
  channel: string;
  user: string;
  text: string;
  ts: string;
  thread_ts?: string;
  reactions?: Array<{
    name: string;
    count: number;
    users: string[];
  }>;
}

export interface SlackChannel {
  id: string;
  name: string;
  is_channel: boolean;
  is_group: boolean;
  is_im: boolean;
  is_member: boolean;
  is_private: boolean;
  is_archived: boolean;
}

export async function getChannelInfo(channelId: string): Promise<SlackChannel | null> {
  try {
    const result = await slackClient.conversations.info({
      channel: channelId
    });

    if (result.ok && result.channel) {
      return {
        id: result.channel.id!,
        name: result.channel.name || 'unknown',
        is_channel: result.channel.is_channel || false,
        is_group: result.channel.is_group || false,
        is_im: result.channel.is_im || false,
        is_member: result.channel.is_member || false,
        is_private: result.channel.is_private || false,
        is_archived: result.channel.is_archived || false
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching channel info:', error);
    return null;
  }
}

export async function getUserInfo(userId: string): Promise<{ id: string; name: string; real_name: string } | null> {
  try {
    const result = await slackClient.users.info({
      user: userId
    });

    if (result.ok && result.user) {
      return {
        id: result.user.id!,
        name: result.user.name || 'unknown',
        real_name: result.user.real_name || result.user.name || 'unknown'
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching user info:', error);
    return null;
  }
}

export async function getChannelHistory(
  channelId: string, 
  oldest?: string, 
  latest?: string,
  limit: number = 100
): Promise<SlackMessage[]> {
  try {
    const result = await slackClient.conversations.history({
      channel: channelId,
      oldest: oldest,
      latest: latest,
      limit: limit,
      include_all_metadata: true
    });

    if (result.ok && result.messages) {
      return result.messages.map(msg => ({
        channel: channelId,
        user: msg.user || 'unknown',
        text: msg.text || '',
        ts: msg.ts!,
        thread_ts: msg.thread_ts,
        reactions: msg.reactions?.map(reaction => ({
          name: reaction.name!,
          count: reaction.count!,
          users: reaction.users || []
        }))
      }));
    }
    return [];
  } catch (error) {
    console.error('Error fetching channel history:', error);
    return [];
  }
}

export async function getThreadReplies(
  channelId: string, 
  threadTs: string
): Promise<SlackMessage[]> {
  try {
    const result = await slackClient.conversations.replies({
      channel: channelId,
      ts: threadTs,
      include_all_metadata: true
    });

    if (result.ok && result.messages) {
      return result.messages.slice(1).map(msg => ({ // Skip the parent message
        channel: channelId,
        user: msg.user || 'unknown',
        text: msg.text || '',
        ts: msg.ts!,
        thread_ts: msg.thread_ts,
        reactions: msg.reactions?.map(reaction => ({
          name: reaction.name!,
          count: reaction.count!,
          users: reaction.users || []
        }))
      }));
    }
    return [];
  } catch (error) {
    console.error('Error fetching thread replies:', error);
    return [];
  }
}

export async function listChannels(): Promise<SlackChannel[]> {
  try {
    const result = await slackClient.conversations.list({
      types: 'public_channel,private_channel',
      exclude_archived: true,
      limit: 1000
    });

    if (result.ok && result.channels) {
      return result.channels
        .filter(channel => channel.is_member) // Only channels the bot is a member of
        .map(channel => ({
          id: channel.id!,
          name: channel.name || 'unknown',
          is_channel: channel.is_channel || false,
          is_group: channel.is_group || false,
          is_im: channel.is_im || false,
          is_member: channel.is_member || false,
          is_private: channel.is_private || false,
          is_archived: channel.is_archived || false
        }));
    }
    return [];
  } catch (error) {
    console.error('Error listing channels:', error);
    return [];
  }
}

export async function joinChannel(channelId: string): Promise<boolean> {
  try {
    const result = await slackClient.conversations.join({
      channel: channelId
    });
    return result.ok || false;
  } catch (error) {
    console.error('Error joining channel:', error);
    return false;
  }
}

export function parseSlackTimestamp(ts: string): Date {
  // Slack timestamps are in format "1234567890.123456"
  const timestamp = parseFloat(ts) * 1000;
  return new Date(timestamp);
}

export function formatSlackTimestamp(date: Date): string {
  return (date.getTime() / 1000).toString();
}

// Helper function to clean Slack message text
export function cleanSlackMessage(text: string): string {
  if (!text) return '';
  
  // Remove user mentions like <@U1234567>
  text = text.replace(/<@[UW][A-Z0-9]+>/g, '@user');
  
  // Remove channel mentions like <#C1234567|general>
  text = text.replace(/<#[CD][A-Z0-9]+\|([^>]+)>/g, '#$1');
  
  // Remove links like <https://example.com|example.com>
  text = text.replace(/<(https?:\/\/[^|>]+)\|([^>]+)>/g, '$2');
  
  // Remove simple links like <https://example.com>
  text = text.replace(/<(https?:\/\/[^>]+)>/g, '$1');
  
  // Remove special commands like <!here> or <!channel>
  text = text.replace(/<![^>]+>/g, '');
  
  // Decode HTML entities
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  
  return text.trim();
}

// Helper function to extract emojis from Slack message
export function extractEmojisFromText(text: string): string[] {
  if (!text) return [];
  
  // Match custom emojis like :custom_emoji:
  const customEmojiMatches = text.match(/:([a-zA-Z0-9_+-]+):/g);
  const customEmojis = customEmojiMatches ? customEmojiMatches.map(match => match.slice(1, -1)) : [];
  
  // Match Unicode emojis (basic pattern)
  const unicodeEmojiMatches = text.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu);
  const unicodeEmojis = unicodeEmojiMatches || [];
  
  return [...customEmojis, ...unicodeEmojis];
}