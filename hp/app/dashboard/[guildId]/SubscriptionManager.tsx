'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export default function SubscriptionManager({ guildId, initialData }: { guildId: string, initialData: any }) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();

  const loadData = async () => {
    const res = await fetch(`/api/subscription/${guildId}`);
    const json = await res.json();
    setData(json);
  };

  const handleCreate = async () => {
    await fetch(`/api/subscription/${guildId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan: 'premium',
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(), // 30日後
      }),
    });
    // データを再フェッチして画面を更新
    startTransition(() => {
      router.refresh();
    });
  };

  const handleCancel = async () => {
    await fetch(`/api/subscription/${guildId}`, { method: 'DELETE' });
    // データを再フェッチして画面を更新
    startTransition(() => {
      router.refresh();
    });
  };

  const latest = data.latest;
  const history = data.subscriptions || [];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">契約管理</h1>

      <div className="bg-white/10 p-4 rounded-2xl mb-6">
        {latest?.plan ? (
          <>
            <p>プラン: {latest.plan}</p>
            <p>状態: {latest.status}</p>
            <p>開始日: {new Date(latest.createdAt).toLocaleDateString()}</p>
            <p>終了日: {latest.expiresAt ? new Date(latest.expiresAt).toLocaleDateString() : '-'}</p>
          </>
        ) : (
          <p>契約情報がありません。</p>
        )}
      </div>

      <div className="flex gap-3 mb-8">
        <button
          onClick={handleCreate}
          disabled={isPending}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
        >
          {isPending ? '処理中...' : '契約／再契約'}
        </button>
        <button
          onClick={handleCancel}
          disabled={isPending}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
        >
          {isPending ? '処理中...' : '解約'}
        </button>
      </div>

      <h2 className="text-lg font-semibold mb-3">契約履歴</h2>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-700">
            <th>プラン</th>
            <th>状態</th>
            <th>開始</th>
            <th>終了</th>
          </tr>
        </thead>
        <tbody>
          {history.map((h: any, i: number) => (
            <tr key={i} className="border-b border-gray-800">
              <td>{h.plan}</td>
              <td>{h.status}</td>
              <td>{new Date(h.createdAt).toLocaleDateString()}</td>
              <td>{h.expiresAt ? new Date(h.expiresAt).toLocaleDateString() : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}