// src/handlers/uriage/uriageLogger.js
const { EmbedBuilder } = require('discord.js');
const { getLogTargets } = require('../../utils/config/configAccessor');

/**
 * 共通：ログ送信
 */
async function sendUriageLog(guild, { store, user, amount, memo }) {
  const logs = await getLogTargets(guild.id);
  if (!logs) return;

  const embed = new EmbedBuilder()
    .setTitle('💰 売上報告ログ')
    .setColor(0xf1c40f)
    .addFields(
      { name: '🏪 店舗', value: store || '不明', inline: true },
      { name: '🧑‍💼 登録者', value: `<@${user.id}>`, inline: true },
      { name: '💵 金額', value: `${Number(amount).toLocaleString()} 円`, inline: true },
      { name: '📝 詳細', value: memo || '-', inline: false }
    )
    .setTimestamp();

  await sendToTargets(guild, logs, embed);
}

/**
 * 承認時ログ
 */
async function sendApprovalLog(guild, { store, approver, targetUser, date }) {
  const logs = await getLogTargets(guild.id);
  if (!logs) return;

  const embed = new EmbedBuilder()
    .setTitle('✅ 売上承認ログ')
    .setColor(0x2ecc71)
    .addFields(
      { name: '🏪 店舗', value: store, inline: true },
      { name: '承認者', value: `<@${approver.id}>`, inline: true },
      { name: '入力者', value: `<@${targetUser.id}>`, inline: true },
      { name: '日付', value: date, inline: false }
    )
    .setFooter({ text: '売上報告承認' })
    .setTimestamp();

  await sendToTargets(guild, logs, embed);
}

/**
 * 修正時ログ
 */
async function sendEditLog(guild, { store, editor, date }) {
  const logs = await getLogTargets(guild.id);
  if (!logs) return;

  const embed = new EmbedBuilder()
    .setTitle('✏️ 売上修正ログ')
    .setColor(0xe67e22)
    .addFields(
      { name: '🏪 店舗', value: store, inline: true },
      { name: '修正者', value: `<@${editor.id}>`, inline: true },
      { name: '修正日', value: date, inline: true }
    )
    .setFooter({ text: '売上報告修正' })
    .setTimestamp();

  await sendToTargets(guild, logs, embed);
}

/**
 * CSV発行ログ
 */
async function sendCsvLog(guild, { store, user, range }) {
  const logs = await getLogTargets(guild.id);
  if (!logs) return;

  const embed = new EmbedBuilder()
    .setTitle('📊 売上CSV発行ログ')
    .setColor(0x3498db)
    .addFields(
      { name: '🏪 店舗', value: store, inline: true },
      { name: '発行者', value: `<@${user.id}>`, inline: true },
      { name: '期間', value: range, inline: true }
    )
    .setFooter({ text: '売上データCSV出力' })
    .setTimestamp();

  await sendToTargets(guild, logs, embed);
}

/**
 * 共通送信処理
 */
async function sendToTargets(guild, logs, embed) {
  const sendTo = async (channelId) => {
    if (!channelId) return;
    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (channel) await channel.send({ embeds: [embed] });
  };

  await sendTo(logs.global);
  await sendTo(logs.admin);
}

module.exports = {
  sendUriageLog,
  sendApprovalLog,
  sendEditLog,
  sendCsvLog,
};
