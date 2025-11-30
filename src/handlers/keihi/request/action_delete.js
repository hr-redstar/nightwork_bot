// src/handlers/keihi/request/action_delete.js
// ----------------------------------------------------
// 経費申請「削除」ボタンの処理
// ----------------------------------------------------

const { MessageFlags } = require('discord.js');
const { loadKeihiConfig } = require('../../../utils/keihi/keihiConfigManager');
const { loadStoreRoleConfig } = require('../../../utils/config/storeRoleConfigManager');
const { sendSettingLog } = require('../../../utils/config/configLogger');
const { resolveStoreName } = require('../setting/panel');
const { IDS } = require('./statusIds');
const {
  getEmbedFieldValue,
  collectApproverRoleIds,
  checkStatusActionPermission,
} = require('./statusHelpers');

/**
 * 削除ボタン押下時
 * @param {import('discord.js').ButtonInteraction} interaction
 */
async function handleDeleteButton(interaction) {
  const { customId, guild, member } = interaction;
  const guildId = guild.id;

  const parts = customId.split('::');
  const [prefix, storeId, threadId, messageId] = parts;

  if (prefix !== IDS.DELETE || !storeId || !threadId || !messageId) {
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const thread = await guild.channels.fetch(threadId).catch(() => null);
  if (!thread || !thread.isThread()) {
    await interaction.editReply({ content: '対象のスレッドが見つかりませんでした。' });
    return;
  }

  const message = await thread.messages.fetch(messageId).catch(() => null);
  if (!message) {
    await interaction.editReply({ content: '対象のメッセージが見つかりませんでした。' });
    return;
  }

  const [keihiConfig, storeRoleConfig] = await Promise.all([
    loadKeihiConfig(guildId),
    loadStoreRoleConfig(guildId).catch(() => null),
  ]);

  const baseEmbed = message.embeds?.[0];
  if (!baseEmbed) {
    await interaction.editReply({ content: '対象の経費申請メッセージが見つかりませんでした。' });
    return;
  }

  const approverRoleIds = collectApproverRoleIds(keihiConfig);
  const { hasPermission, message: permError } = checkStatusActionPermission('delete', member, baseEmbed, approverRoleIds);
  if (!hasPermission) {
    await interaction.editReply({ content: permError });
    return;
  }

  const storeName = resolveStoreName(storeRoleConfig, storeId);
  const now = new Date();
  const tsUnix = Math.floor(now.getTime() / 1000);
  const deletedAtText = `<t:${tsUnix}:f>`;

  await message.edit({
    content: `❌ 経費申請　削除しました　削除者：${member}　削除時間：${deletedAtText}`,
    embeds: [baseEmbed],
    components: [],
  });

  const parentChannel = thread.isThread() && thread.parent ? thread.parent : thread;
  const logMessageId = baseEmbed.footer?.text?.startsWith('LogID: ') ? baseEmbed.footer.text.slice('LogID: '.length) : null;

  if (parentChannel && logMessageId) {
    const logMessage = await parentChannel.messages.fetch(logMessageId).catch(() => null);
    if (logMessage) {
      const extra = [`×経費申請が削除されました。`, `削除者：${member}　削除時間：${deletedAtText}`, `スレッドメッセージリンク：${message.url}`].join('\n');
      const newLogContent = `${logMessage.content}\n${extra}`;
      await logMessage.edit({ content: newLogContent });
    }
  }

  const originalDate = getEmbedFieldValue(baseEmbed, '日付');
  const originalDepartment = getEmbedFieldValue(baseEmbed, '部署');
  const originalItemName = getEmbedFieldValue(baseEmbed, '経費項目');

  await sendSettingLog(interaction, {
    title: '経費申請削除',
    description: `❌ 店舗「${storeName}」の経費申請を削除しました。\n削除者：${member}　削除時間：${deletedAtText}\n日付：${originalDate}　部署：${originalDepartment}　経費項目：${originalItemName}\nスレッドメッセージリンク：${message.url}`,
  });

  await interaction.editReply({ content: '経費申請を削除しました。' });
}

module.exports = { handleDeleteButton };