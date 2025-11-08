export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';

const storage = new Storage();
const bucketName = process.env.GCS_BUCKET_NAME!;

export async function GET() {
  const [files] = await storage.bucket(bucketName).getFiles({ prefix: '', delimiter: '/' });

  for (const file of files) {
    if (!file.name.endsWith('subscriptions.json')) continue;

    const [contents] = await file.download();
    let subs = JSON.parse(contents.toString());
    let updated = false;

    subs = subs.map((s: any) => {
      if (s.status === 'active' && s.expiresAt && new Date(s.expiresAt) < new Date()) {
        updated = true;
        return { ...s, status: 'expired' };
      }
      return s;
    });

    if (updated) {
      await file.save(JSON.stringify(subs, null, 2), { contentType: 'application/json' });
    }
  }

  return NextResponse.json({ message: 'Expired subscriptions updated.' });
}
