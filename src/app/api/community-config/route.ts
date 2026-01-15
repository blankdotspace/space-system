import { NextResponse } from 'next/server';

export async function POST(): Promise<Response> {
  return NextResponse.json({ success: false }, { status: 410 });
}

export async function GET(): Promise<Response> {
  return NextResponse.json({ success: false }, { status: 410 });
}
