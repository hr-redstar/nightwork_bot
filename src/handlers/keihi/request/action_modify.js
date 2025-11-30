// src/handlers/keihi/request/action_modify.js
// ----------------------------------------------------
// 経費申請「修正」ボタンの処理
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
 * 修正ボタン押下時
 * @param {import('discord.js').ButtonInteraction} interaction
 */
async function handleModifyButton(interaction) {
  const { customId, guild, member } = interaction;
  const guildId = guild.id;

  const parts = customId.split('::');
  const [prefix, storeId, threadId, messageId] = parts;

  if (prefix !== IDS.MODIFY || !storeId || !threadId || !messageId) {
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
  const { hasPermission, message: permError } = checkStatusActionPermission('modify', member, baseEmbed, approverRoleIds);
  if (!hasPermission) {
    await interaction.editReply({ content: permError });
    return;
  }

  const storeName = resolveStoreName(storeRoleConfig, storeId);
  const now = new Date();
  const tsUnix = Math.floor(now.getTime() / 1000);
  const modifiedAtText = `<t:${tsUnix}:f>`;

  await message.edit({
    content: `✏️ 経費申請　修正しました　修正者：${member}　修正時間：${modifiedAtText}`,
    embeds: message.embeds,
    components: message.components,
  });

  const parentChannel = thread.isThread() && thread.parent ? thread.parent : thread;
  const logMessageId = baseEmbed.footer?.text?.startsWith('LogID: ') ? baseEmbed.footer.text.slice('LogID: '.length) : null;

  if (parentChannel && logMessageId) {
    const logMessage = await parentChannel.messages.fetch(logMessageId).catch(() => null);
    if (logMessage) {
      let content = logMessage.content;
      if (/^修正者：/m.test(content)) {
        content = content.replace(/^修正者：.*$/m, `修正者：${member}　修正時間：${modifiedAtText}`);
      } else {
        content = content.replace(/承認者：.*$/m, `修正者：${member}　修正時間：${modifiedAtText}\n$&`);
      }
      await logMessage.edit({ content });
    }
  }

  const originalDate = getEmbedFieldValue(baseEmbed, '日付');
  const originalDepartment = getEmbedFieldValue(baseEmbed, '部署');
  const originalItemName = getEmbedFieldValue(baseEmbed, '経費項目');

  await sendSettingLog(interaction, {
    title: '経費申請修正',
    description: `✏️ 店舗「${storeName}」の経費申請を修正しました。\n修正者：${member}　修正時間：${modifiedAtText}\n日付：${originalDate}　部署：${originalDepartment}　経費項目：${originalItemName}\nスレッドメッセージリンク：${message.url}`,
  });

  await interaction.editReply({ content: '経費申請を「修正済み」としてマークしました。' });
}

/**
 * @param {import('discord.js').ModalSubmitInteraction} interaction
 */
async function handleModifyModalSubmit(interaction) {
  await interaction.reply({ content: '経費申請の修正モーダル処理は現在準備中です。', flags: MessageFlags.Ephemeral });
}

module.exports = { handleModifyButton, handleModifyModalSubmit };