import { NextRequest, NextResponse } from 'next/server';
import { backfillAggregation } from '@/lib/aggregation';

export async function POST(request: NextRequest) {
  try {
    const { days = 7 } = await request.json().catch(() => ({}));
    
    if (days > 30) {
      return NextResponse.json(
        { error: 'Maximum backfill period is 30 days' }, 
        { status: 400 }
      );
    }
    
    await backfillAggregation(days);
    
    return NextResponse.json({ 
      success: true, 
      message: `Backfill completed for ${days} days` 
    });
  } catch (error) {
    console.error('Backfill error:', error);
    return NextResponse.json(
      { error: 'Failed to run backfill' }, 
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Backfill aggregation endpoint. Use POST with {days: number} to trigger backfill.' 
  });
}