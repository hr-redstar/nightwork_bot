// src/handlers/keihi/request/status.js
// ----------------------------------------------------
// 経費申請のステータス変更処理（承認・修正・削除）
// ----------------------------------------------------

const { EmbedBuilder, MessageFlags } = require('discord.js');
const {
  loadKeihiConfig,
} = require('../../../utils/keihi/keihiConfigManager');
const {
  loadStoreRoleConfig,
} = require('../../../utils/config/storeRoleConfigManager');
const { sendAdminLog } = require('../../../utils/config/configLogger');
const { resolveStoreName } = require('../setting/storeNameResolver');
const { collectAllowedRoleIdsForRequest } = require('./helpers.js');
const logger = require('../../../utils/logger');

/**
 * ボタンインタラクションから情報をパースし、共通のチェックを行う
 * @param {import('discord.js').ButtonInteraction} interaction
 * @returns {Promise<{error: string|null, data: object|null}>}
 */
async function parseAndValidate(interaction) {
  const { customId, guild, member, channel } = interaction;
  const [, storeId, threadId, messageId] = customId.split('::');

  if (!storeId || !threadId || !messageId) {
    return { error: 'ボタンの情報が不足しています。', data: null };
  }

  const [keihiConfig, storeRoleConfig] = await Promise.all([
    loadKeihiConfig(guild.id),
    loadStoreRoleConfig(guild.id).catch(() => null),
  ]);

  const { approverRoleIds } = collectAllowedRoleIdsForRequest(
    keihiConfig,
    storeId,
    storeRoleConfig,
  );

  if (!approverRoleIds.some((roleId) => member.roles.cache.has(roleId))) {
    return { error: 'この操作を行う権限がありません。', data: null };
  }

  if (!channel || channel.id !== threadId) {
    return { error: 'この操作は申請スレッド内から実行してください。', data: null };
  }

  const targetMessage = await channel.messages.fetch(messageId).catch(() => null);
  if (!targetMessage) {
    return { error: '対象の申請メッセージが見つかりませんでした。', data: null };
  }

  const baseEmbed = targetMessage.embeds?.[0];
  if (!baseEmbed) {
    return {
      error: '対象の申請メッセージに埋め込み情報がありません。',
      data: null,
    };
  }

  // フッターから LogID を安全に抽出
  const footerText = baseEmbed.footer?.text || '';
  const logId = footerText.startsWith('LogID: ')
    ? footerText.slice('LogID: '.length)
    : footerText || null;

  const storeName = resolveStoreName(storeRoleConfig, storeId);

  return {
    error: null,
    data: {
      storeId,
      storeName,
      targetMessage,
      baseEmbed,
      logId,
    },
  };
}

/**
 * 経費申請を承認する
 * @param {import('discord.js').ButtonInteraction} interaction
 */
async function handleApprove(interaction) {
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  } catch (e) {
    logger.error('[keihi/status] deferReply 失敗', e);
    return;
  }

  const { error, data } = await parseAndValidate(interaction);
  if (error) {
    await interaction.editReply({ content: error }).catch(() => {});
    return;
  }

  const { storeName, targetMessage, baseEmbed, logId } = data;

  try {
    const originalEmbed = baseEmbed;

    // ステータスフィールドだけ差し替え
    const fields = Array.isArray(originalEmbed.fields)
      ? originalEmbed.fields.map((f) => ({ ...f }))
      : [];

    const statusIndex = fields.findIndex((f) => f.name === 'ステータス');
    const statusValue = `✅ 承認済み (by ${interaction.member})`;

    if (statusIndex >= 0) {
      fields[statusIndex] = {
        ...fields[statusIndex],
        value: statusValue,
        inline: true,
      };
    } else {
      fields.push({
        name: 'ステータス',
        value: statusValue,
        inline: true,
      });
    }

    const updatedEmbed = EmbedBuilder.from(originalEmbed).setFields(fields);

    await targetMessage.edit({
      embeds: [updatedEmbed],
      // 必要ならボタンを消す／承認だけ無効にするなど好きに調整
      // components: [],
    });

    await interaction.editReply({ content: 'この経費申請を承認しました。' });

    await sendAdminLog(interaction, {
      title: '経費申請承認',
      description: `店舗「${storeName}」の経費申請が承認されました。\nLogID: ${logId ?? '不明'}`,
    });
  } catch (e) {
    logger.error('経費申請の承認処理中にエラー', e);
    await interaction
      .editReply({ content: '承認処理中にエラーが発生しました。' })
      .catch(() => {});
  }
}

/**
 * 経費申請を修正する（修正モードに入る）
 * @param {import('discord.js').ButtonInteraction} interaction
 */
async function handleModify(interaction) {
  await interaction.reply({
    content: '修正機能は現在実装中です。',
    flags: MessageFlags.Ephemeral,
  });
}

/**
 * 経費申請を削除する
 * @param {import('discord.js').ButtonInteraction} interaction
 */
async function handleDelete(interaction) {
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  } catch (e) {
    logger.error('[keihi/status] deferReply(DELETE) 失敗', e);
    return;
  }

  const { error, data } = await parseAndValidate(interaction);
  if (error) {
    await interaction.editReply({ content: error }).catch(() => {});
    return;
  }

  const { storeName, targetMessage, logId } = data;

  try {
    await targetMessage.delete().catch(() => {});
    await interaction.editReply({ content: 'この経費申請を削除しました。' });

    await sendAdminLog(interaction, {
      title: '経費申請削除',
      description: `店舗「${storeName}」の経費申請が削除されました。\nLogID: ${logId ?? '不明'}`,
    });
  } catch (e) {
    logger.error('経費申請の削除処理中にエラー', e);
    await interaction
      .editReply({ content: '削除処理中にエラーが発生しました。' })
      .catch(() => {});
  }
}