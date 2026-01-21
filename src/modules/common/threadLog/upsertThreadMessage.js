// modules/common/threadMessage/upsertThreadMessage.js
const { buildThreadMessage } = require('./buildThreadMessage');

async function upsertThreadMessage({
  thread,
  messageId, // 既存があれば
  payload,
  components = [],
}) {
  const content = buildThreadMessage(payload);
  const options = { content, components };

  if (messageId) {
    const msg = await thread.messages.fetch(messageId);
    await msg.edit(options);
    return msg.id;
  }

  const msg = await thread.send(options);
  return msg.id;
}

module.exports = { upsertThreadMessage };