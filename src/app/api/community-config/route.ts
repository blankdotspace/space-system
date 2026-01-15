import { NextResponse } from 'next/server';

const REMOVAL_MESSAGE = 'Community config creation has moved to Supabase edge functions.';

export async function POST(): Promise<Response> {
  return NextResponse.json({ success: false, error: REMOVAL_MESSAGE }, { status: 410 });
}

export async function GET(): Promise<Response> {
  return NextResponse.json({ success: false, error: REMOVAL_MESSAGE }, { status: 410 });
}
