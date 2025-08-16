import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export interface SentimentResult {
  sentiment: 'positive' | 'neutral' | 'negative';
  score: number; // 0-1 range
  confidence: number; // 0-1 range
  burnoutSignals: boolean;
  reasoning?: string;
}

export interface EmojiSentiment {
  emoji: string;
  sentiment: number; // -1 to 1 range
}

// Pre-defined emoji sentiment mappings for efficiency
const EMOJI_SENTIMENT_MAP: Record<string, number> = {
  // Positive emojis
  '😀': 0.8, '😃': 0.8, '😄': 0.9, '😁': 0.8, '😆': 0.7, '😅': 0.6,
  '🤣': 0.7, '😂': 0.7, '🙂': 0.6, '😊': 0.8, '😇': 0.8, '🥰': 0.9,
  '😍': 0.9, '🤩': 0.8, '😘': 0.7, '😗': 0.6, '😚': 0.7, '😙': 0.6,
  '🥲': 0.4, '😋': 0.7, '😛': 0.6, '😜': 0.7, '🤪': 0.6, '😝': 0.6,
  '🤑': 0.5, '🤗': 0.8, '🤭': 0.5, '🤫': 0.3, '🤔': 0.2, '🤐': 0.1,
  '🤨': 0.0, '😐': 0.0, '😑': -0.1, '😶': 0.0, '😏': 0.3, '😒': -0.3,
  '🙄': -0.4, '😬': -0.2, '🤥': -0.3, '😔': -0.6, '😕': -0.5, '🙁': -0.5,
  '☹️': -0.6, '😣': -0.5, '😖': -0.5, '😫': -0.7, '😩': -0.7, '🥺': -0.3,
  '😢': -0.8, '😭': -0.8, '😤': -0.4, '😠': -0.8, '😡': -0.9, '🤬': -0.9,
  '🤯': -0.6, '😳': -0.2, '🥵': -0.3, '🥶': -0.3, '😱': -0.7, '😨': -0.7,
  '😰': -0.8, '😥': -0.6, '😓': -0.5, '🤝': 0.7, '👍': 0.7,
  '👎': -0.7, '👌': 0.6, '🤞': 0.5, '✌️': 0.6, '🤟': 0.7, '🤘': 0.6,
  '👏': 0.8, '🙌': 0.9, '👐': 0.5, '🤲': 0.6, '🙏': 0.7, '✍️': 0.4,
  '💪': 0.8, '🦾': 0.7, '🦿': 0.3, '🦵': 0.2, '🦶': 0.1, '👂': 0.1,
  '🧠': 0.5, '🫀': 0.4, '🫁': 0.2, '🦷': 0.1, '🦴': 0.0, '👀': 0.2,
  '👁️': 0.1, '👅': 0.2, '👄': 0.3, '💋': 0.6, '🩸': -0.3, '💔': -0.9,
  '❤️': 0.9, '🧡': 0.8, '💛': 0.8, '💚': 0.8, '💙': 0.8, '💜': 0.8,
  '🤎': 0.5, '🖤': 0.3, '🤍': 0.7, '💯': 0.9, '💢': -0.7, '💥': -0.2,
  '💫': 0.6, '💦': 0.1, '💨': 0.2, '🕳️': -0.4, '💣': -0.8, '💬': 0.3,
  '👁️‍🗨️': 0.2, '🗨️': 0.3, '🗯️': -0.2, '💭': 0.4, '💤': 0.2,
  // Work-related emojis
  '💻': 0.3, '⌨️': 0.2, '🖥️': 0.2, '🖨️': 0.1, '🖱️': 0.1, '🖲️': 0.1,
  '💽': 0.1, '💾': 0.1, '💿': 0.1, '📀': 0.1, '🧮': 0.2, '🎬': 0.4,
  '📺': 0.2, '📷': 0.4, '📸': 0.4, '📹': 0.3, '📼': 0.2, '🔍': 0.3,
  '🔎': 0.3, '🕯️': 0.4, '💡': 0.7, '🔦': 0.3, '🏮': 0.5, '🪔': 0.4,
  '📔': 0.4, '📕': 0.3, '📖': 0.5, '📗': 0.4, '📘': 0.4, '📙': 0.4,
  '📚': 0.6, '📓': 0.4, '📒': 0.4, '📃': 0.2, '📜': 0.3, '📄': 0.2,
  '📰': 0.3, '🗞️': 0.2, '📑': 0.2, '🔖': 0.3, '🏷️': 0.2, '💰': 0.6,
  '🪙': 0.5, '💴': 0.4, '💵': 0.5, '💶': 0.4, '💷': 0.4, '💸': -0.3,
  '💳': 0.2, '🧾': 0.1, '💹': 0.7, '✉️': 0.3, '📧': 0.3, '📨': 0.4,
  '📩': 0.4, '📤': 0.3, '📥': 0.3, '📦': 0.3, '📫': 0.4, '📪': 0.2,
  '📬': 0.4, '📭': 0.2, '📮': 0.3, '🗳️': 0.5, '✏️': 0.4, '✒️': 0.3,
  '🖋️': 0.4, '🖊️': 0.3, '🖌️': 0.5, '🖍️': 0.4, '📝': 0.4, '💼': 0.4,
  '📁': 0.3, '📂': 0.3, '🗂️': 0.3, '📅': 0.4, '📆': 0.4, '🗒️': 0.3,
  '🗓️': 0.4, '📇': 0.3, '📈': 0.8, '📉': -0.5, '📊': 0.5, '📋': 0.4,
  '📌': 0.3, '📍': 0.3, '📎': 0.2, '🖇️': 0.2, '📏': 0.2, '📐': 0.2,
  '✂️': -0.1, '🗃️': 0.2, '🗄️': 0.2, '🗑️': -0.2, '🔒': 0.2, '🔓': 0.1,
  '🔏': 0.3, '🔐': 0.4, '🔑': 0.5, '🗝️': 0.4, '🔨': 0.2, '🪓': -0.1,
  '⛏️': 0.1, '⚒️': 0.2, '🛠️': 0.4, '🗡️': -0.3, '⚔️': -0.4, '🔫': -0.8,
  '🪃': 0.1, '🏹': 0.2, '🛡️': 0.4, '🪚': 0.1, '🔧': 0.3, '🪛': 0.2,
  '🔩': 0.2, '⚙️': 0.3, '🗜️': 0.1, '⚖️': 0.5, '🦯': 0.2, '🔗': 0.4,
  '⛓️': -0.2, '🪝': 0.1, '🧰': 0.4, '🧲': 0.3, '🪜': 0.2, '⚗️': 0.4,
  '🧪': 0.4, '🧫': 0.2, '🧬': 0.5, '🔬': 0.5, '🔭': 0.6, '📡': 0.4,
};

export async function analyzeSentiment(
  message: string, 
  reactions: Array<{ emoji: string; count: number }> = []
): Promise<SentimentResult> {
  try {
    // Quick check for empty or very short messages
    if (!message || message.trim().length < 3) {
      return {
        sentiment: 'neutral',
        score: 0.5,
        confidence: 0.3,
        burnoutSignals: false
      };
    }

    // Calculate emoji sentiment
    const emojiSentiment = calculateEmojiSentiment(reactions);

    // Prepare prompt for Claude Haiku
    const prompt = `Analyze this workplace Slack message for sentiment and burnout signals. Consider both text content and emoji reactions.

Message: "${message}"
Reactions: ${reactions.map(r => `${r.emoji} (${r.count})`).join(', ') || 'none'}

Analyze for:
1. Overall workplace sentiment (positive/neutral/negative)
2. Sentiment score (0.0-1.0, where 0.0 = very negative, 0.5 = neutral, 1.0 = very positive)
3. Confidence in analysis (0.0-1.0)
4. Burnout signals (excessive work hours mentions, stress indicators, overwhelm, frustration with workload)

Return ONLY valid JSON in this format:
{"sentiment": "positive|neutral|negative", "score": 0.5, "confidence": 0.8, "burnoutSignals": false}`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 200,
      temperature: 0.1,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
    
    try {
      const result = JSON.parse(responseText.trim()) as SentimentResult;
      
      // Validate and normalize the result
      const normalizedResult: SentimentResult = {
        sentiment: ['positive', 'neutral', 'negative'].includes(result.sentiment) 
          ? result.sentiment as 'positive' | 'neutral' | 'negative'
          : 'neutral',
        score: Math.max(0, Math.min(1, Number(result.score) || 0.5)),
        confidence: Math.max(0, Math.min(1, Number(result.confidence) || 0.5)),
        burnoutSignals: Boolean(result.burnoutSignals)
      };

      // Adjust score based on emoji sentiment if significant
      if (emojiSentiment !== null && Math.abs(emojiSentiment) > 0.2) {
        const emojiWeight = 0.3; // 30% weight for emojis
        const textWeight = 0.7;  // 70% weight for text
        
        // Convert emoji sentiment from -1,1 range to 0,1 range
        const normalizedEmojiSentiment = (emojiSentiment + 1) / 2;
        normalizedResult.score = (normalizedResult.score * textWeight) + (normalizedEmojiSentiment * emojiWeight);
        
        // Update sentiment label if score changed significantly
        if (normalizedResult.score >= 0.6) {
          normalizedResult.sentiment = 'positive';
        } else if (normalizedResult.score <= 0.4) {
          normalizedResult.sentiment = 'negative';
        } else {
          normalizedResult.sentiment = 'neutral';
        }
      }

      return normalizedResult;
      
    } catch (parseError) {
      console.error('Failed to parse Claude response:', parseError, 'Response:', responseText);
      
      // Fallback: simple keyword-based analysis
      return fallbackSentimentAnalysis(message, reactions);
    }
    
  } catch (error) {
    console.error('Sentiment analysis error:', error);
    
    // Fallback to simple analysis
    return fallbackSentimentAnalysis(message, reactions);
  }
}

function calculateEmojiSentiment(reactions: Array<{ emoji: string; count: number }>): number | null {
  if (!reactions || reactions.length === 0) return null;

  let totalSentiment = 0;
  let totalWeight = 0;

  for (const reaction of reactions) {
    const sentimentValue = EMOJI_SENTIMENT_MAP[reaction.emoji];
    if (sentimentValue !== undefined) {
      totalSentiment += sentimentValue * reaction.count;
      totalWeight += reaction.count;
    }
  }

  return totalWeight > 0 ? totalSentiment / totalWeight : null;
}

function fallbackSentimentAnalysis(
  message: string, 
  reactions: Array<{ emoji: string; count: number }>
): SentimentResult {
  const text = message.toLowerCase();
  
  // Simple keyword analysis
  const positiveWords = ['great', 'awesome', 'excellent', 'good', 'nice', 'love', 'perfect', 'amazing', 'fantastic', 'wonderful', 'thanks', 'thank you', 'appreciate', 'helpful', 'success', 'win', 'celebrate', 'congrats', 'well done'];
  const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'problem', 'issue', 'error', 'fail', 'failure', 'broken', 'bug', 'stuck', 'frustrated', 'annoying', 'annoyed', 'stressed', 'overwhelmed', 'burnout', 'exhausted', 'tired', 'overworked'];
  const burnoutWords = ['overtime', 'late night', 'weekend work', 'burnout', 'exhausted', 'overwhelmed', 'too much', 'can\'t handle', 'breaking point', 'stressed out', 'no time', 'overloaded'];

  let score = 0.5; // neutral baseline
  let burnoutSignals = false;

  // Check for positive words
  for (const word of positiveWords) {
    if (text.includes(word)) {
      score += 0.1;
    }
  }

  // Check for negative words
  for (const word of negativeWords) {
    if (text.includes(word)) {
      score -= 0.1;
    }
  }

  // Check for burnout signals
  for (const word of burnoutWords) {
    if (text.includes(word)) {
      burnoutSignals = true;
      score -= 0.15;
    }
  }

  // Factor in emoji sentiment
  const emojiSentiment = calculateEmojiSentiment(reactions);
  if (emojiSentiment !== null) {
    const normalizedEmojiSentiment = (emojiSentiment + 1) / 2;
    score = (score * 0.7) + (normalizedEmojiSentiment * 0.3);
  }

  // Normalize score
  score = Math.max(0, Math.min(1, score));

  let sentiment: 'positive' | 'neutral' | 'negative';
  if (score >= 0.6) {
    sentiment = 'positive';
  } else if (score <= 0.4) {
    sentiment = 'negative';
  } else {
    sentiment = 'neutral';
  }

  return {
    sentiment,
    score,
    confidence: 0.4, // Lower confidence for fallback
    burnoutSignals
  };
}

export async function generateWeeklyInsights(
  channelData: Array<{
    channelId: string;
    channelName: string;
    avgSentiment: number;
    messageCount: number;
    burnoutRisk: number;
    trend: string;
  }>
): Promise<{ insights: string[]; recommendations: string[] }> {
  try {
    const prompt = `As a workplace wellness expert, analyze this weekly team sentiment data and provide actionable insights for managers.

Channel Data:
${channelData.map(channel => 
  `- ${channel.channelName}: ${channel.messageCount} messages, avg sentiment: ${channel.avgSentiment.toFixed(2)}, burnout risk: ${channel.burnoutRisk.toFixed(2)}, trend: ${channel.trend}`
).join('\n')}

Provide:
1. Key insights about team mood and engagement patterns
2. Specific, actionable recommendations for managers

Return ONLY valid JSON:
{"insights": ["insight1", "insight2", "insight3"], "recommendations": ["rec1", "rec2", "rec3"]}`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022', // Use Sonnet for complex analysis
      max_tokens: 500,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
    const result = JSON.parse(responseText.trim());
    
    return {
      insights: Array.isArray(result.insights) ? result.insights : [],
      recommendations: Array.isArray(result.recommendations) ? result.recommendations : []
    };
    
  } catch (error) {
    console.error('Weekly insights generation error:', error);
    
    // Fallback insights
    return {
      insights: [
        "Team sentiment data collected for analysis",
        "Communication patterns indicate normal workplace activity",
        "Regular monitoring will help identify trends over time"
      ],
      recommendations: [
        "Continue monitoring team communication patterns",
        "Check in with team members during 1:1 meetings",
        "Maintain open channels for feedback and concerns"
      ]
    };
  }
}