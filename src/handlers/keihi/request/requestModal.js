// src/handlers/keihi/request/requestModal.js
// ----------------------------------------------------
// 経費申請モーダル送信後の処理
//   - 入力値バリデーション
//   - プライベートスレッド作成
//   - スレッドへメンバー追加
//   - スレッドへのメッセージ送信
//   - 経費申請チャンネルへのログ出力
//   - 管理者ログ出力
//   - パネル再描画
// ----------------------------------------------------

const {
  ActionRowBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');

const {
  loadKeihiConfig,
} = require('../../../utils/keihi/keihiConfigManager');
const {
  loadStoreRoleConfig,
} = require('../../../utils/config/storeRoleConfigManager');
const { sendAdminLog } = require('../../../utils/config/configLogger');

const {
  validateAndGetData,
  findOrCreateExpenseThread,
  addMembersToThread,
  collectAllowedRoleIdsForRequest,
  refreshPanelAndSave,
  resolveRoleIdsFromPositions,
  resolveStoreNameSafe, // helpers.jsからインポートされる
} = require('./helpers.js');
const { IDS: REQ_IDS } = require('./requestIds');
const { IDS: STATUS_IDS } = require('./statusIds');
const logger = require('../../../utils/logger');

/**
 * 経費申請モーダル送信時
 * @param {import('discord.js').ModalSubmitInteraction} interaction
 */
async function handleRequestModalSubmit(interaction) {
  const customId = interaction.customId; // keihi_request_request_modal::店舗名::index
  const [prefix, storeId] = customId.split('::'); // "keihi_request_request_modal", "店舗名"

  if (prefix !== REQ_IDS.REQUEST_MODAL || !storeId) {
    return; // 想定外
  }

  const guild = interaction.guild;
  const guildId = guild.id;
  const member = interaction.member;

  try {
    // ephemeral は非推奨になったため flags を使用
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  } catch (e) {
    console.error('deferReplyでエラーが発生しました。followUpで通知を試みます:', e);
    await interaction
      .followUp({
        content: '応答の準備に失敗しました。インタラクションがタイムアウトした可能性があります。',
        flags: MessageFlags.Ephemeral,
      })
      .catch((err) =>
        console.error('followUpでのエラー通知にも失敗しました:', err),
      );
    return;
  }

  try {
    // 1. バリデーションとデータ取得
    const { error, data } = validateAndGetData(interaction);
    if (error) {
      await interaction.editReply({ content: error });
      return;
    }
    const { dateStr, department, itemName, amount, note } = data;

    const [keihiConfig, storeRoleConfig] = await Promise.all([
      loadKeihiConfig(guildId),
      loadStoreRoleConfig(guildId).catch(() => null),
    ]);

    const panelConfig = keihiConfig.panels?.[storeId];
    if (!panelConfig || !panelConfig.channelId) {
      await interaction.editReply({
        content: '経費申請パネルの設定が見つかりません。',
      });
      return;
    }

    // 申請パネルチャンネル
    const channel = await guild.channels
      .fetch(panelConfig.channelId)
      .catch(() => null);
    if (!channel || !channel.isTextBased()) {
      await interaction.editReply({
        content: '経費申請ログ用のチャンネルに送信できません。',
      });
      return;
    }

    const storeName = resolveStoreNameSafe(storeRoleConfig, storeId);

    const thread = await findOrCreateExpenseThread(
      channel,
      dateStr,
      storeName,
    );

    // 3. スレッドにメンバーを追加（店舗ごとの権限＋旧 roles.request も含む）
    const { allowedRoleIds } = collectAllowedRoleIdsForRequest(
      keihiConfig,
      storeId,
      storeRoleConfig,
    );
    await addMembersToThread(thread, guild, member, allowedRoleIds);

    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mi = String(now.getMinutes()).padStart(2, '0');
    const timestampText = `${dateStr || '不明'} ${hh}:${mi}`;
    const tsUnix = Math.floor(now.getTime() / 1000);

    // 4. スレッドに送信するメッセージを構築
    const content = '経費申請';
    const initialEmbed = new EmbedBuilder()
      .setTitle('経費申請')
      .addFields(
        { name: '日付', value: dateStr, inline: true },
        { name: '部署', value: department, inline: true },
        { name: '経費項目', value: itemName, inline: false },
        { name: '金額', value: `${amount.toLocaleString()} 円`, inline: true },
        { name: '備考', value: note || '未入力', inline: false },
        { name: 'ステータス', value: '🕒 申請中', inline: true },
        { name: '入力者', value: `${member}`, inline: true },
        { name: '入力時間', value: timestampText, inline: true },
      )
      .setTimestamp()
      .setFooter({ text: 'LogID: PENDING' });

    // 5. スレッドにメッセージを送信（この時点ではボタンなし）
    const threadMessage = await thread.send({
      content,
      embeds: [initialEmbed],
    });

    // 6. 申請チャンネルにログを送信
    const logLines = [
      '------------------------------',
      `${dateStr || '不明日付'} の経費申請をしました。`,
      `入力者：${member}　入力時間：<t:${tsUnix}:f>`,
      '修正者：',
      '承認者：',
      `スレッドメッセージリンク：${threadMessage.url}`,
      '------------------------------',
    ];
    const logMessage = await channel.send({
      content: logLines.join('\n'),
    });

    // 7. スレッドメッセージを更新 (フッターにログIDを、ボタンにスレッド/メッセージIDを設定)
    const finalEmbed = EmbedBuilder.from(initialEmbed).setFooter({
      text: `LogID: ${logMessage.id}`,
    });

    const finalButtonsRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(
          `${STATUS_IDS.APPROVE}::${storeId}::${thread.id}::${threadMessage.id}`,
        )
        .setLabel('承認')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(
          `${STATUS_IDS.MODIFY}::${storeId}::${thread.id}::${threadMessage.id}`,
        )
        .setLabel('修正')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(
          `${STATUS_IDS.DELETE}::${storeId}::${thread.id}::${threadMessage.id}`,
        )
        .setLabel('削除')
        .setStyle(ButtonStyle.Danger),
    );

    await threadMessage.edit({
      embeds: [finalEmbed],
      components: [finalButtonsRow],
    });

    // 8. 管理者ログを送信
    try {
      await sendAdminLog(interaction, {
        title: '経費申請',
        description:
          `店舗「${storeName}」で経費申請がされました。\n` +
          `日付：${dateStr}　部署：${department || '未入力'}　経費項目：${itemName}\n` +
          `金額：${amount.toLocaleString()} 円　備考：${note || '未入力'}\n` +
          `入力者：${member}　入力時間：${timestampText}\n` +
          `スレッドメッセージリンク：${threadMessage.url}`,
      });
    } catch (logError) {
      console.error('管理者ログの送信に失敗しました:', logError);
      await interaction.followUp({
        content:
          '⚠️ 管理者ログの送信に失敗しました。\n' +
          'ボットに管理者ログチャンネルへの「メッセージを送信」「埋め込みリンク」権限があるか確認してください。',
        flags: MessageFlags.Ephemeral,
      });
    }

    // 9. ユーザーへの最終応答
    await interaction.editReply({
      content:
        `店舗「${storeName}」で経費申請を登録しました。\n` +
        `スレッド: ${threadMessage.url}`,
    });

    // 10. 経費申請パネルを再描画して最新化
    try {
      await refreshPanelAndSave(guild, storeId, keihiConfig, storeRoleConfig);
    } catch (e) {
      console.error('経費申請パネルの再描画中にエラーが発生しました:', e);
    }
  } catch (error) {
    console.error('経費申請モーダル処理中にエラーが発生しました:', error);
    await interaction
      .editReply({
        content:
          '経費申請の処理中にエラーが発生しました。コンソールログを確認してください。',
      })
      .catch((e) => {
        console.error('エラー通知の送信に失敗しました:', e);
      });
  }
}

module.exports = {
  handleRequestModalSubmit,
};
