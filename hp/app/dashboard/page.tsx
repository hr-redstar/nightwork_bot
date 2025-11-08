'use client';

import { useEffect, useState } from 'react';
import DashboardCardSkeleton from "@/components/DashboardCardSkeleton";
import DashboardCard from "@/components/DashboardCard";
import { fetchStoreStatuses, StoreStatus } from "@/lib/fetchData";

export default function DashboardPage() {
  const [data, setData] = useState<StoreStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStoreStatuses().then((res) => {
      setData(res);
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-center">店舗ダッシュボード</h1>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <DashboardCardSkeleton />
          <DashboardCardSkeleton />
          <DashboardCardSkeleton />
        </div>
      ) : data.length === 0 ? (
        <p className="text-center text-gray-500">データがありません。</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.map((store) => (
            <DashboardCard
              key={store.guildId}
              title={store.name}
              description={`ID: ${store.guildId}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
