import { NextRequest, NextResponse } from 'next/server';
import { aggregateDailyData } from '@/lib/aggregation';

export async function POST(request: NextRequest) {
  try {
    const { date } = await request.json().catch(() => ({}));
    const targetDate = date ? new Date(date) : new Date();
    
    await aggregateDailyData(targetDate);
    
    return NextResponse.json({ 
      success: true, 
      message: `Daily aggregation completed for ${targetDate.toISOString().split('T')[0]}` 
    });
  } catch (error) {
    console.error('Daily aggregation error:', error);
    return NextResponse.json(
      { error: 'Failed to run daily aggregation' }, 
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Daily aggregation endpoint. Use POST to trigger aggregation.' 
  });
}