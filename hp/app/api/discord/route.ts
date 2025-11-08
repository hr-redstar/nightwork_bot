// File: app/api/discord/route.ts
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  return NextResponse.json({ message: 'Discord API endpoint working!' });
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    console.log('Received Discord POST:', data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/discord error:', error);
    return NextResponse.json({ ok: false, error: 'Invalid request body' }, { status: 400 });
  }
}