import { NextRequest, NextResponse } from 'next/server';
import { generateWeeklyInsightReport } from '@/lib/aggregation';
import { startOfWeek } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    const { weekStart } = await request.json().catch(() => ({}));
    const targetWeekStart = weekStart ? startOfWeek(new Date(weekStart)) : startOfWeek(new Date());
    
    await generateWeeklyInsightReport(targetWeekStart);
    
    return NextResponse.json({ 
      success: true, 
      message: `Weekly insights generated for week starting ${targetWeekStart.toISOString().split('T')[0]}` 
    });
  } catch (error) {
    console.error('Weekly insights generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate weekly insights' }, 
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Weekly insights generation endpoint. Use POST to trigger generation.' 
  });
}