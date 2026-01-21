// modules/common/channelLog/upsertChannelLog.js
const { buildChannelLogMessage } = require('./buildChannelLogMessage');

async function upsertChannelLog({
  channel,            // 親テキストチャンネル
  existingMessageId,  // 既存ログID（あれば）
  payload,            // buildChannelLogMessage の引数
}) {
  const content = buildChannelLogMessage(payload);

  if (existingMessageId) {
    const msg = await channel.messages.fetch(existingMessageId);
    await msg.edit({ content });
    return msg.id;
  }

  const msg = await channel.send({ content });
  return msg.id;
}

module.exports = { upsertChannelLog };