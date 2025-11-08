// app/api/bot-command/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { command } = await req.json();

  try {
    const botResponse = await fetch(`${process.env.BOT_INTERNAL_URL}/bot/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command }),
    });

    const result = await botResponse.json();
    return NextResponse.json({ message: result.message || 'Bot応答なし' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Bot通信エラー' }, { status: 500 });
  }
}
