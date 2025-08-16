// Quick test script for sentiment analysis
const { analyzeSentiment } = require('./src/lib/sentiment.ts');

async function test() {
  try {
    console.log('Testing sentiment analysis...');
    
    const result1 = await analyzeSentiment("Great work everyone! This is awesome! 🎉", [
      { emoji: "🎉", count: 3 },
      { emoji: "👍", count: 2 }
    ]);
    
    console.log('Positive message result:', result1);
    
    const result2 = await analyzeSentiment("This is really frustrating, working overtime again 😩", [
      { emoji: "😩", count: 1 }
    ]);
    
    console.log('Negative message result:', result2);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();