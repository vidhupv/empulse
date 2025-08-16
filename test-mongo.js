const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://vidhuvasudevan2000:WVwvhFfEeQ71WAVe@empulse-buildathon.spuzrpo.mongodb.net/?retryWrites=true&w=majority&appName=empulse-buildathon';

async function testConnection() {
  try {
    console.log('Testing MongoDB connection...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected successfully!');
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
  }
}

testConnection();