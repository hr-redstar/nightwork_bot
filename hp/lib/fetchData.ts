import axios from 'axios';

export interface StoreStatus {
  guildId: string;
  name: string;
  // 他のプロパティもここに追加できます
}

export async function fetchStoreStatuses(): Promise<StoreStatus[]> {
  // ここではダミーデータを返しますが、将来的にはAPIを呼び出します
  // const response = await axios.get(`${process.env.API_BASE_URL}/stores`);
  // return response.data;
  // 動作確認用のダミーデータ
  return [
    { guildId: '123456789', name: '店舗A' },
    { guildId: '987654321', name: '店舗B' },
    { guildId: '112233445', name: '店舗C' },
  ];
}