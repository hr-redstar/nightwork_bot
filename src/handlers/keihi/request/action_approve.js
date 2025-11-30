// src/handlers/keihi/request/action_approve.js
// ----------------------------------------------------
// 経費申請「承認」ボタンの処理
// ----------------------------------------------------

const { EmbedBuilder, MessageFlags } = require('discord.js');
const { loadKeihiConfig } = require('../../../utils/keihi/keihiConfigManager');
const { loadStoreRoleConfig } = require('../../../utils/config/storeRoleConfigManager');
const { sendSettingLog } = require('../../../utils/config/configLogger');
const { resolveStoreName } = require('../setting/panel');
const { IDS } = require('./statusIds');
const {
  getEmbedFieldValue,
  collectApproverRoleIds,
  checkStatusActionPermission,
  buildStatusButtons,
} = require('./statusHelpers');

/**
 * 承認ボタン押下時
 * @param {import('discord.js').ButtonInteraction} interaction
 */
async function handleApproveButton(interaction) {
  const { customId, guild, member } = interaction;
  const guildId = guild.id;

  const parts = customId.split('::');
  const [prefix, storeId, threadId, messageId] = parts;

  if (prefix !== IDS.APPROVE || !storeId || !threadId || !messageId) {
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

  const approverRoleIds = collectApproverRoleIds(keihiConfig);

  if (!approverRoleIds.length) {
    await interaction.editReply({
      content: '承認役職が設定されていないため、承認できません。\n先に `/設定経費` から承認役職を設定してください。',
    });
    return;
  }

  const baseEmbed = message.embeds?.[0];
  if (!baseEmbed) {
    await interaction.editReply({ content: '対象の経費申請メッセージが見つかりませんでした。' });
    return;
  }

  const { hasPermission, message: permError } = checkStatusActionPermission('approve', member, baseEmbed, approverRoleIds);
  if (!hasPermission) {
    await interaction.editReply({ content: permError });
    return;
  }

  const storeName = resolveStoreName(storeRoleConfig, storeId);
  const now = new Date();
  const tsUnix = Math.floor(now.getTime() / 1000);
  const approvedAtText = `<t:${tsUnix}:f>`;

  const fields = Array.isArray(baseEmbed.fields) ? baseEmbed.fields.map((f) => ({ ...f })) : [];
  const upsertField = (name, value, inline = true) => {
    const found = fields.find((f) => f.name === name);
    if (found) {
      found.value = value;
      found.inline = inline;
    } else {
      fields.push({ name, value, inline });
    }
  };

  upsertField('ステータス', '✅ 承認済み', true);
  upsertField('承認者', `${member}`, true);
  upsertField('承認時間', approvedAtText, true);

  const newEmbed = EmbedBuilder.from(baseEmbed).setTitle('経費申請 ✅ 承認されました').setFields(fields).setTimestamp(now);
  const newButtonsRow = buildStatusButtons(storeId, threadId, messageId, 'APPROVED');

  await message.edit({ embeds: [newEmbed], components: [newButtonsRow] });

  const parentChannel = thread.isThread() && thread.parent ? thread.parent : thread;
  const logMessageId = baseEmbed.footer?.text?.startsWith('LogID: ') ? baseEmbed.footer.text.slice('LogID: '.length) : null;

  if (parentChannel && logMessageId) {
    const logMessage = await parentChannel.messages.fetch(logMessageId).catch(() => null);
    if (logMessage) {
      let content = logMessage.content;
      if (/^承認者：/m.test(content)) {
        content = content.replace(/^承認者：.*$/m, `承認者：${member}　承認時間：${approvedAtText}`);
      } else {
        content = content.replace(/------------------------------\s*$/m, `承認者：${member}　承認時間：${approvedAtText}\n------------------------------`);
      }
      await logMessage.edit({ content });
    }
  }

  const originalDate = getEmbedFieldValue(baseEmbed, '日付');
  const originalDepartment = getEmbedFieldValue(baseEmbed, '部署');
  const originalItemName = getEmbedFieldValue(baseEmbed, '経費項目');
  const originalInputUser = getEmbedFieldValue(baseEmbed, '入力者');
  const originalInputTime = getEmbedFieldValue(baseEmbed, '入力時間');

  await sendSettingLog(interaction, {
    title: '経費申請承認',
    description: `✅ 店舗「${storeName}」の経費申請を承認しました。\n承認者：${member}\n承認時間：${approvedAtText}\n日付：${originalDate}　部署：${originalDepartment}　経費項目：${originalItemName}\n入力者：${originalInputUser}　入力時間：${originalInputTime}\nスレッドメッセージリンク：${message.url}`,
  });

  await interaction.editReply({ content: '経費申請を承認しました。' });
}

module.exports = { handleApproveButton };