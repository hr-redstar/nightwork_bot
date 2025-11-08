'use client';
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="text-center space-y-6">
      <h1 className="text-4xl font-bold mt-10">ナイトワーク向け 業務改善Bot</h1>
      <p className="text-lg text-gray-700">
        出退勤、店内状況、接客ログ、KPI管理を一元化。
        <br />
        店舗業務のデジタル化をサポートします。
      </p>
      <div className="mt-8 flex justify-center gap-4">
        <Link
          href="/dashboard"
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg shadow-md"
        >
          ダッシュボードへ
        </Link>
        <a href="https://discord.com/oauth2/authorize" target="_blank" className="bg-gray-800 hover:bg-gray-900 text-white px-6 py-3 rounded-lg">
          Discordで連携
        </a>
      </div>
    </div>
  );
}
