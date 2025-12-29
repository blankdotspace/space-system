import { NextResponse } from 'next/server';

/**
 * Test endpoint to verify logging works in Vercel
 * Visit: /api/test-logs
 */
export async function GET() {
  console.error('[TEST-LOGS] API route called - this should appear in Vercel logs');
  console.log('[TEST-LOGS] console.log test');
  console.warn('[TEST-LOGS] console.warn test');
  
  return NextResponse.json({ 
    message: 'Check Vercel logs for test messages',
    timestamp: new Date().toISOString()
  });
}

