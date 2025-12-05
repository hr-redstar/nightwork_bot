// src/handlers/keihi/request/action_modify.js
// ----------------------------------------------------
// 経費申請「修正」ボタンの処理（ステータス上の「修正済み」マーク）
// ----------------------------------------------------

const { MessageFlags } = require('discord.js');
const { loadKeihiConfig } = require('../../../utils/keihi/keihiConfigManager');
const { loadStoreRoleConfig } = require('../../../utils/config/storeRoleConfigManager');
const { sendSettingLog } = require('../../../utils/config/configLogger');
const { resolveStoreName } = require('../setting/panel');
const {
  getEmbedFieldValue,
  collectApproverRoleIds,
  checkStatusActionPermission,
} = require('./statusHelpers');

/**
 * 修正ボタン押下時
 * @param {import('discord.js').ButtonInteraction} interaction
 */
async function handleModifyButton(interaction) {
  const { customId, guild, member } = interaction;
  const guildId = guild.id;

  // keihi_request_modify::{storeId}::{threadId}::{messageId}::{status?}
  const parts = customId.split('::');
  const [, storeId, threadId, messageId] = parts;

  if (!storeId || !threadId || !messageId) return;

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
    await interaction.editReply({
      content: '対象の経費申請メッセージが見つかりませんでした。',
    });
    return;
  }

  const approverRoleIds = collectApproverRoleIds(keihiConfig);
  const { hasPermission, message: permError } = checkStatusActionPermission(
    'modify',
    member,
    baseEmbed,
    approverRoleIds,
  );
  if (!hasPermission) {
    await interaction.editReply({ content: permError });
    return;
  }

  const storeName = resolveStoreName(storeRoleConfig, storeId);
  const now = new Date();
  const tsUnix = Math.floor(now.getTime() / 1000);
  const modifiedAtText = `<t:${tsUnix}:f>`;

  const originalDate = getEmbedFieldValue(baseEmbed, '日付');
  const originalDepartment = getEmbedFieldValue(baseEmbed, '部署');
  const originalItemName = getEmbedFieldValue(baseEmbed, '経費項目');

  await message.edit({
    content: `✏️ 経費申請　修正しました　修正者：${member}　修正時間：${modifiedAtText}`,
    embeds: message.embeds,
    components: message.components,
  });

  const threadChannel = message.channel;
  const parentChannel =
    threadChannel.isThread() && threadChannel.parent
      ? threadChannel.parent
      : threadChannel;

  const footerText = baseEmbed.footer?.text || '';
  const logMessageId = footerText.startsWith('LogID: ')
    ? footerText.slice('LogID: '.length)
    : null;

  if (parentChannel && logMessageId) {
    const logMessage = await parentChannel.messages
      .fetch(logMessageId)
      .catch(() => null);
    if (logMessage) {
      let content = logMessage.content;

      if (/^修正者：/m.test(content)) {
        content = content.replace(
          /^修正者：.*$/m,
          `修正者：${member}　修正時間：${modifiedAtText}`,
        );
      } else {
        content = content.replace(
          /承認者：.*$/m,
          `修正者：${member}　修正時間：${modifiedAtText}\n$&`,
        );
      }

      await logMessage.edit({ content });
    }
  }

  await sendSettingLog(interaction, {
    title: '経費申請修正',
    description:
      `✏️ 店舗「${storeName}」の経費申請を修正しました。\n` +
      `修正者：${member}　修正時間：${modifiedAtText}\n` +
      `日付：${originalDate}　部署：${originalDepartment}　経費項目：${originalItemName}\n` +
      `スレッドメッセージリンク：${message.url}`,
  });

  await interaction.editReply({
    content: '経費申請を「修正済み」としてマークしました。',
  });
}

module.exports = { handleModifyButton };
