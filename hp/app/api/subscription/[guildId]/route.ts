import { NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';

const storage = new Storage( {
  projectId: process.env.GCP_PROJECT_ID,
  credentials: JSON.parse(process.env.GCP_SERVICE_ACCOUNT_KEY || "{}"),
} );

// =====================
// GET: 最新契約 + 履歴
// =====================
export async function GET(
  req: Request,
  { params }: { params: { guildId: string } }
) {
  try {
    const bucket = storage.bucket(process.env.GCS_BUCKET_NAME!);
    const file = bucket.file(`${params.guildId}/subscriptions.json`);
    const [exists] = await file.exists();

    if (!exists) {
      return NextResponse.json({ subscriptions: [] });
    }

    const [content] = await file.download();
    const data = JSON.parse(content.toString());
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Subscription fetch error:", err);
    return NextResponse.json(
      { error: "Failed to load subscription data" },
      { status: 500 }
    );
  }
}

// ✅ これが必須！（exportがないとNext.jsがモジュールと認識しない）
export const dynamic = "force-dynamic";
