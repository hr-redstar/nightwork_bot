import axios from "axios";

export default async function DashboardPage({ params }: { params: { guildId: string } }) {
  const { guildId } = params;

  // GCSやBot側のCloud Run APIからデータ取得
  const res = await axios.get(`${process.env.API_BASE_URL}/guild/${guildId}`);
  const data = res.data;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Guild Dashboard</h1>
      <p className="text-gray-700">Guild ID: {guildId}</p>
      <pre className="bg-white p-4 rounded shadow mt-4">{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
