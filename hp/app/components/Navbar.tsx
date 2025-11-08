// hp/components/Navbar.tsx
import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="bg-black text-white px-6 py-4 flex justify-between items-center">
      <h1 className="text-lg font-bold">Nightwork Bot</h1>
      <div className="flex gap-6 text-sm">
        <Link href="/">ホーム</Link>
        <Link href="/dashboard">ダッシュボード</Link>
        <Link href="/login">ログイン</Link>
      </div>
    </nav>
  );
}
