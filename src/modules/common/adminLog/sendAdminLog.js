// modules/common/adminLog/sendAdminLog.js
const { buildAdminLogEmbed } = require('./buildAdminLogEmbed');

async function sendAdminLog({
  guild,
  embed,
}) {
  const adminLogChannel = guild.channels.cache.find(
    ch => ch.name === '管理者ログ'
  );

  if (!adminLogChannel) return;

  await adminLogChannel.send({
    embeds: [embed],
  });
}

module.exports = {
  sendAdminLog,
};