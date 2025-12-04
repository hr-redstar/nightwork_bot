// ----------------------------------------------------
// 売上報告 ステータスボタン処理（承認 / 修正 / 削除）
// ----------------------------------------------------

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, MessageFlags } = require('discord.js');
const logger = require('../../../utils/logger');
const { IDS: STATUS_IDS } = require('./statusIds');
const { updateUriageRecord } = require('../../../utils/uriage/gcsUriageManager');
const { openUriageEditModal } = require('./requestFlow');

// ログメッセージの本文を行ごとに編集するユーティリティ
function updateLogContentLine(original, startsWith, newLine) {
  const lines = original.split('\n');
  const idx = lines.findIndex((l) => l.startsWith(startsWith));
  if (idx === -1) return original;
  lines[idx] = newLine;
  return lines.join('\n');
}

/**
 * スレッド内の Embed から「日付」を取り出す
 * @param {import('discord.js').Message} msg
 * @returns {string | null} "YYYY-MM-DD" 形式想定
 */
function getDateFromEmbed(msg) {
  const embed = msg.embeds[0];
  if (!embed) return null;

  const field = (embed.fields || []).find((f) => f.name === '日付');
  if (!field) return null;

  return field.value.split(/\s+/)[0].trim();
}

/**
 * スレッドメッセージに紐づく「売上報告パネル側のログメッセージ」を探す
 * @param {import('discord.js').ButtonInteraction} interaction
 * @returns {Promise<import('discord.js').Message | null>}
 */
async function findPanelLogMessage(interaction) {
  try {
    const threadMessage = interaction.message;
    const thread = interaction.channel;
    const parentChannel = thread.parent;

    if (!parentChannel) return null;

    const targetUrl = threadMessage.url;

    // 直近50件くらいから検索（必要に応じて増やす）
    const fetched = await parentChannel.messages.fetch({ limit: 50 });

    const logMsg = fetched.find((msg) => msg.content.includes(targetUrl));
    return logMsg || null;
  } catch (err) {
    logger.warn('[uriage][findPanelLogMessage] エラー:', err);
    return null;
  }
}

/**
 * スレッド内の Embed に「承認者/修正者」などを反映
 * @param {import('discord.js').ButtonInteraction} interaction
 * @param {'approve' | 'edit' | 'delete'} action
 */
async function updateThreadEmbed(interaction, action) {
  const msg = interaction.message;
  const oldEmbed = msg.embeds[0];
  if (!oldEmbed) return;

  const nowUnix = Math.floor(Date.now() / 1000);

  // 既存フィールドから「承認者/承認時間/修正者/修正時間」を消して再構成する
  const filteredFields = (oldEmbed.fields ?? []).filter(
    (f) =>
      f.name !== '承認者' &&
      f.name !== '承認時間' &&
      f.name !== '修正者' &&
      f.name !== '修正時間',
  );

  // 新しいフィールドを追加
  if (action === 'approve') {
    filteredFields.push(
      {
        name: '承認者',
        value: `${interaction.user}`,
        inline: true,
      },
      {
        name: '承認時間',
        value: `<t:${nowUnix}:f>`,
        inline: true,
      },
    );
  } else if (action === 'edit') {
    filteredFields.push(
      {
        name: '修正者',
        value: `${interaction.user}`,
        inline: true,
      },
      {
        name: '修正時間',
        value: `<t:${nowUnix}:f>`,
        inline: true,
      },
    );
  }

  let newEmbed = EmbedBuilder.from(oldEmbed).setFields(filteredFields);

  if (action === 'delete') {
    const oldTitle = oldEmbed.title || '売上報告';
    newEmbed = newEmbed.setTitle(`【削除済み】${oldTitle}`);
  }

  await msg.edit({
    embeds: [newEmbed],
    components:
      action === 'delete'
        ? disableAllButtons(msg)
        : msg.components, // 承認/修正はボタンはそのまま
  });
}

/**
 * 既存のボタンを全部 disabled にして返す
 * @param {import('discord.js').Message} msg
 * @returns {ActionRowBuilder[]}
 */
function disableAllButtons(msg) {
  return msg.components.map((row) => {
    const newRow = new ActionRowBuilder();
    row.components.forEach((comp) => {
      try {
        const btn = ButtonBuilder.from(comp).setDisabled(true);
        newRow.addComponents(btn);
      } catch {
        // ボタン以外は無視
      }
    });
    return newRow;
  });
}

/**
 * 売上報告 ステータスボタンのエントリーポイント
 * @param {import('discord.js').ButtonInteraction} interaction
 */
async function handleStatusButton(interaction) {
  const customId = interaction.customId;

  // ★ 修正ボタンはここでは deferReply せず、モーダルだけ開く
  if (customId === STATUS_IDS.BUTTON.EDIT) {
    return openUriageEditModal(interaction);
  }

  // ここから下は 承認 / 削除
  if (
    customId !== STATUS_IDS.BUTTON.APPROVE &&
    customId !== STATUS_IDS.BUTTON.DELETE
  ) {
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const nowUnix = Math.floor(Date.now() / 1000);
    const guildId = interaction.guild.id;
    const threadMessage = interaction.message;
    const dateStr = getDateFromEmbed(threadMessage);
    const logMsg = await findPanelLogMessage(interaction);

    const basePatch = {
      updatedAt: new Date().toISOString(),
    };

    if (!dateStr) {
      logger.warn('[uriage][handleStatusButton] dateStr を取得できませんでした');
    }

    if (customId === STATUS_IDS.BUTTON.APPROVE) {
      // 1) スレッド Embed 更新（承認者/時間追加）
      await updateThreadEmbed(interaction, 'approve');

      // 2) パネル側ログメッセージの「承認者」行を更新
      if (logMsg) {
        const newContent = updateLogContentLine(
          logMsg.content,
          '承認者：',
          `承認者：${interaction.user}　承認時間：<t:${nowUnix}:f>`,
        );
        await logMsg.edit(newContent);
      }

      // 3) GCS のステータス更新
      if (dateStr) {
        await updateUriageRecord(guildId, dateStr, threadMessage.id, {
          ...basePatch,
          status: 'approved',
          approvedById: interaction.user.id,
          approvedByTag: interaction.user.tag,
          approvedAt: new Date().toISOString(),
        });
      }

      await interaction.editReply('✅ この売上報告を承認しました。');
    } else if (customId === STATUS_IDS.BUTTON.DELETE) {
      // 削除マーク

      await updateThreadEmbed(interaction, 'delete');

      if (logMsg) {
        const lines = logMsg.content.split('\n');
        const firstLine = '※この売上報告は削除されました。';
        if (!lines[0].startsWith(firstLine)) {
          lines.unshift(firstLine);
        }
        await logMsg.edit(lines.join('\n'));
      }

      if (dateStr) {
        await updateUriageRecord(guildId, dateStr, threadMessage.id, {
          ...basePatch,
          status: 'deleted',
          deletedById: interaction.user.id,
          deletedByTag: interaction.user.tag,
          deletedAt: new Date().toISOString(),
        });
      }

      await interaction.editReply('🗑️ この売上報告を「削除済み」としてマークしました。');
    }
  } catch (err) {
    logger.error('[uriage][handleStatusButton] エラー:', err);
    await interaction.editReply('ステータス変更中にエラーが発生しました。');
  }
}

module.exports = {
  handleStatusButton,
};
