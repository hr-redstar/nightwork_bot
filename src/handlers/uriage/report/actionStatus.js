// src/handlers/uriage/report/actionStatus.js
// 売上報告の 承認 / 修正 / 削除 ボタン処理（承認のみ実装）

const { EmbedBuilder, MessageFlags } = require('discord.js');
const {
  loadUriageDailyData,
  saveUriageDailyData,
  buildUriageCsvForPeriod,
} = require('../../../utils/uriage/gcsUriageManager');
const { loadUriageConfig } = require('../../../utils/uriage/uriageConfigManager');
const { STATUS_IDS } = require('./statusIds');
const logger = require('../../../utils/logger');
const { sendSettingLog, sendAdminLog } = require('../../../utils/config/configLogger');

/**
 * 承認ボタン
 * customId: `${STATUS_IDS.APPROVE}::${storeId}::${threadId}`
 */
async function handleApproveButton(interaction) {
  const { customId, guild, member, message } = interaction;
  const parts = customId.split('::');
  const [, storeId] = parts;
  if (!storeId) return;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  // 承認権限チェック（承認役職 or 管理者）
  const uriageConfig = await loadUriageConfig(guild.id);
  const approverRoleIds = uriageConfig.approverRoleIds || [];
  const hasPerm =
    member.permissions.has('Administrator') ||
    member.roles.cache.some(r => approverRoleIds.includes(r.id));
  if (!hasPerm) {
    await interaction.editReply({ content: '承認権限がありません。' });
    return;
  }

  const baseEmbed = message.embeds?.[0];
  if (!baseEmbed) {
    await interaction.editReply({ content: '対象メッセージの情報が取得できませんでした。' });
    return;
  }

  const now = new Date();
  const nowUnix = Math.floor(now.getTime() / 1000);
  const approvedAtText = `<t:${nowUnix}:f>`;

  // Embed 更新
  const fields = Array.isArray(baseEmbed.fields) ? baseEmbed.fields.map(f => ({ ...f })) : [];
  const upsert = (name, value, inline = true) => {
    const f = fields.find(x => x.name === name);
    if (f) {
      f.value = value;
      f.inline = inline;
    } else {
      fields.push({ name, value, inline });
    }
  };
  upsert('ステータス', '✅ 承認済み', true);
  upsert('承認者', `${member}`, true);
  upsert('承認時間', approvedAtText, true);

  const newEmbed = EmbedBuilder.from(baseEmbed).setFields(fields).setTimestamp(now);
  await message.edit({ embeds: [newEmbed], components: message.components });

  // JSON 更新
  try {
    const dateField = fields.find(f => f.name === '日付')?.value?.trim();
    const date = dateField || '';
    if (date) {
      const daily = (await loadUriageDailyData(guild.id, storeId, date)) || {};
      if (Array.isArray(daily.requests)) {
        const rec = daily.requests.find(r => r.id === message.id);
        if (rec) {
          rec.status = 'APPROVED';
          rec.approvedById = member.id;
          rec.approvedByName = member.displayName || member.user.username;
          rec.approvedAtText = approvedAtText;
          rec.approvedAt = now.toISOString();
          daily.lastUpdated = now.toISOString();
          await saveUriageDailyData(guild.id, storeId, date, daily);
          await buildUriageCsvForPeriod(guild.id, storeId, 'daily', date);
        }
      }
    }
  } catch (err) {
    logger.warn('[uriage/actionStatus] JSON/CSV 更新に失敗', err);
  }

  await interaction.editReply({ content: '売上報告を承認しました。' });
  try {
    await sendSettingLog(interaction, {
      title: '売上報告 承認',
      description: `${member} が売上報告を承認しました。\nメッセージ: ${message.url}`,
    });
    await sendAdminLog(interaction, {
      title: '売上報告 承認',
      description: `${member} が売上報告を承認しました。\nメッセージ: ${message.url}`,
    });
  } catch (e) {
    logger.warn('[uriage/actionStatus] ログ送信に失敗しました', e);
  }
}

async function handleModifyButton(interaction) {
  await interaction.reply({
    content: '修正機能は現在準備中です。',
    flags: MessageFlags.Ephemeral,
  });
}

async function handleDeleteButton(interaction) {
  await interaction.reply({
    content: '削除機能は現在準備中です。',
    flags: MessageFlags.Ephemeral,
  });
}

module.exports = {
  handleApproveButton,
  handleModifyButton,
  handleDeleteButton,
};
