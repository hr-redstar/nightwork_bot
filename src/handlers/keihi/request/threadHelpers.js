// src/handlers/keihi/request/threadHelpers.js
const dayjs = require('dayjs');

async function findOrCreateKeihiThread({
  parentChannel,
  storeName,
  now,
  requesterId,
}) {
  const ym = dayjs(now).format('YYYY-MM');
  const threadName = `${ym}-${storeName}-経費申請`;

  // まずアクティブから探す
  const active = await parentChannel.threads.fetchActive().catch(() => null);
  const foundActive = active?.threads?.find((t) => t.name === threadName) || null;
  if (foundActive) return { thread: foundActive, threadName };

  // アーカイブから探す（見つかったら解除して使う）
  const archived = await parentChannel.threads.fetchArchived({ limit: 50 }).catch(() => null);
  const foundArchived = archived?.threads?.find((t) => t.name === threadName) || null;
  if (foundArchived) {
    await foundArchived.setArchived(false).catch(() => {});
    return { thread: foundArchived, threadName };
  }

  // 無ければ作成（private thread）
  const thread = await parentChannel.threads.create({
    name: threadName,
    autoArchiveDuration: 1440, // 24 hours
    type: 12, // ChannelType.PrivateThread
    reason: '経費申請スレッド作成',
  });

  // 申請者は必ず追加
  if (requesterId) await thread.members.add(requesterId).catch(() => {});
  return { thread, threadName };
}

module.exports = { findOrCreateKeihiThread };