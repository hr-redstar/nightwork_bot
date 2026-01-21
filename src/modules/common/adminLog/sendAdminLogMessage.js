// modules/common/adminLog/sendAdminLogMessage.js
const { buildAdminLogMessage } = require('./buildAdminLogMessage');

async function sendAdminLogMessage({
  logChannel,
  payload,
}) {
  const content = buildAdminLogMessage(payload);
  await logChannel.send({ content });
}

module.exports = { sendAdminLogMessage };