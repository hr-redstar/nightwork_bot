// modules/common/channelLog/sendOrUpdateChannelLog.js
async function sendOrUpdateChannelLog({
  parentChannel,
  messageId,
  embed,
}) {
  // 初回
  if (!messageId) {
    const msg = await parentChannel.send({ embeds: [embed] });
    return msg.id;
  }

  // 更新
  try {
    const msg = await parentChannel.messages.fetch(messageId);
    await msg.edit({ embeds: [embed] });
    return msg.id;
  } catch {
    // メッセージ消失時は再作成
    const msg = await parentChannel.send({ embeds: [embed] });
    return msg.id;
  }
}

module.exports = {
  sendOrUpdateChannelLog,
};