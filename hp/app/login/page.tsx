// app/login/page.tsx
export default function LoginPage() {
  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
  const redirectUri = encodeURIComponent(`${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`);
  const scope = 'identify';
  const discordLoginUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}`;

  return (
    <div className="max-w-2xl mx-auto text-center mt-20">
      <h2 className="text-2xl font-bold mb-6">Discord ログイン</h2>
      <a
        href={discordLoginUrl}
        className="px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700"
      >
        Discord でログイン
      </a>
    </div>
  );
}
