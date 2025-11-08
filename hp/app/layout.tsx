export const metadata = {
  title: "ナイトワーク業務改善ダッシュボード",
  description: "Discord連携・店舗管理・業務改善を一元化",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 text-gray-900">
        {children}
      </body>
    </html>
  );
}
