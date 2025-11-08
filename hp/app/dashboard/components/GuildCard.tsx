import React from 'react';

export default function GuildCard({ guild }: { guild: any }) {
  const sub = guild.subscription;
  const status = sub
    ? `プラン: ${sub.plan}（有効期限: ${new Date(sub.expiresAt).toLocaleDateString()}）`
    : '未契約';

  return (
    <div className="bg-white/10 p-4 rounded-2xl shadow-md hover:shadow-lg transition">
      <div className="flex items-center gap-3">
        {guild.icon ? (
          <img
            src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
            alt={guild.name}
            className="w-10 h-10 rounded-full"
          />
        ) : (
          <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
            {guild.name[0]}
          </div>
        )}
        <div>
          <h2 className="font-semibold text-lg">{guild.name}</h2>
          <p className="text-sm text-gray-300">{status}</p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        {sub ? (
          <button className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm">
            管理ページ
          </button>
        ) : (
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm">
            契約する
          </button>
        )}
      </div>
    </div>
  );
}
