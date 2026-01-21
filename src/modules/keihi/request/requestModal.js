// src/handlers/keihi/request/requestModal.js
// ----------------------------------------------------
// 経費申請モーダル送信後の処理
//   - 入力値バリデーション
//   - プライベートスレッド作成
//   - スレッドへメンバー追加
//   - スレッドへのメッセージ送信
//   - 経費申請チャンネルへのログ出力（LogID）
//   - 管理者ログ出力（① 新規）→ AdminLogID をチャンネルログへ埋め込み
//   - パネル再描画
// ----------------------------------------------------

const {
  ActionRowBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');

const { loadKeihiConfig } = require('../../../utils/keihi/keihiConfigManager');
const { loadStoreRoleConfig } = require('../../../utils/config/storeRoleConfigManager');
const { getGuildConfig } = require('../../../utils/config/gcsConfigManager');
const { sendAdminLog } = require('../../../utils/config/configLogger');

const logger = require('../../../utils/logger');
const { resolveStoreName } = require('../setting/storeNameResolver');

const {
  validateAndGetData,
  collectAllowedRoleIdsForRequest,
  refreshPanelAndSave,

  // ✅ これが無いと動かないので helpers 側にある前提で読み込む
  findOrCreateKeihiThread,
  addMembersToThread,
} = require('./helpers.js');

const { IDS: REQ_IDS } = require('./requestIds');
const { IDS: STATUS_IDS } = require('./statusIds');

// panel.js 側で { COLORS } を export している想定
const { COLORS } = require('./panel');
const { buildKeihiAdminLogEmbed_Request } = require('./adminLogEmbeds');

function blankField() {
  return { name: '\u200b', value: '\u200b', inline: true };
}

/**
 * keihiLog（申請チャンネルログ）を統一フォーマットで作る
 */
function buildKeihiLogText({
  dateStr,
  memberMention,
  timestampText,
  threadMessageUrl,
  adminLogId,
  keihiLogId,
}) {
  const adminLine = adminLogId ? `AdminLogID: ${adminLogId}` : 'AdminLogID:';
  const keihiLine = keihiLogId ? `keihiLogID: ${keihiLogId}` : 'keihiLogID:';

  return [
    '------------------------------',
    `${dateStr || '不明日付'} の経費申請をしました。`,
    `入力者：${memberMention}　入力時間：${timestampText}`,
    '修正者：',
    '承認者：',
    `スレッドメッセージリンク：${threadMessageUrl}`,
    adminLine,
    '',
    keihiLine,
    '------------------------------',
  ].join('\n');
}
/**
 * 経費申請モーダル送信時
 * @param {import('discord.js').ModalSubmitInteraction} interaction
 */
async function handleRequestModalSubmit(interaction) {
  const { customId, guild, member } = interaction;

  // 期待形式: `${REQ_IDS.REQUEST_MODAL}::${storeKey}::...`
  const PREFIX = `${REQ_IDS.REQUEST_MODAL}::`;
  if (!customId?.startsWith(PREFIX)) return;

  const storeKey = customId.slice(PREFIX.length).split('::')[0];
  if (!storeKey || !guild) return;

  const guildId = guild.id;

  // defer
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  } catch (deferErr) {
    logger.error('[keihi/request/requestModal] deferReply failed', deferErr);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content:
            '応答の準備に失敗しました。インタラクションがタイムアウトした可能性があります。',
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.followUp({
          content:
            '応答の準備に失敗しました。インタラクションがタイムアウトした可能性があります。',
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch (err) {
      logger.error('[keihi/request/requestModal] notify failed after deferReply error', err);
    }
    return;
  }

  try {
    // 1) バリデーションとデータ取得
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

    const panelConfig = keihiConfig.panels?.[storeKey];
    if (!panelConfig?.channelId) {
      await interaction.editReply({ content: '経費申請パネルの設定が見つかりません。' });
      return;
    }

    // 申請パネルチャンネル（= keihiLog を出すチャンネル）
    const channel = await guild.channels.fetch(panelConfig.channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      await interaction.editReply({ content: '経費申請ログ用のチャンネルに送信できません。' });
      return;
    }

    // 表示用店舗名
    const storeName = resolveStoreName(storeRoleConfig, storeKey);

    // 2) スレッド作成/取得
    const now = new Date();
    const { thread } = await findOrCreateKeihiThread({
      parentChannel: channel,
      storeName,
      now,
      requesterId: member.id,
    });

    // 3) スレッドにメンバー追加（申請者 + 承認役職ユーザー + 閲覧役職）
    const { allowedRoleIds } = collectAllowedRoleIdsForRequest(
      keihiConfig,
      storeKey,
      storeRoleConfig,
    );
    await addMembersToThread(thread, guild, member, allowedRoleIds);

    const tsUnix = Math.floor(now.getTime() / 1000);
    const timestampText = `<t:${tsUnix}:f>`;

    // 4) スレッドに送る申請Embed（レイアウト：1〜5列目）
    const initialEmbed = new EmbedBuilder()
      .setTitle('経費申請')
      .setColor(COLORS?.BLUE ?? 0x5865f2) // ✅ 申請: 青
      .addFields(
        // 1列目
        { name: 'ステータス', value: '🕒 申請中', inline: true },
        { name: '日付', value: dateStr, inline: true },
        { name: '部署', value: department || '未入力', inline: true },

        // 2列目
        { name: '経費項目', value: itemName || '未入力', inline: true },
        { name: '金額', value: `${Number(amount || 0).toLocaleString()} 円`, inline: true },
        { name: '備考', value: note || '未入力', inline: true },

        // 3列目
        { name: '入力者', value: `${member}`, inline: true },
        { name: '入力時間', value: timestampText, inline: true },
        blankField(),

        // 4列目
        { name: '修正者', value: '未入力', inline: true },
        { name: '修正時間', value: '未入力', inline: true },
        blankField(),

        // 5列目
        { name: '承認者', value: '未入力', inline: true },
        { name: '承認時間', value: '未入力', inline: true },
        blankField(),
      )
      .setTimestamp(now)
      .setFooter({ text: 'LogID: PENDING' }); // ✅ keihiLog message.id を後で入れる

    const threadMessage = await thread.send({
      content: '経費申請',
      embeds: [initialEmbed],
    });

    // 5) keihiLog（申請チャンネルログ）をまず送る（この message.id が keihiLogID）
    const logMessage = await channel.send({
      content: buildKeihiLogText({
        dateStr,
        memberMention: `${member}`,
        timestampText,
        threadMessageUrl: threadMessage.url,
        adminLogId: null, // 後で編集で入れる
        keihiLogId: null, // 後で埋める（今は logMessage.id がまだ無い）
      }),
    });

    // 5-2) keihiLogID を入れて keihiLog を即更新（あなたのフォーマットに合わせる）
    await logMessage.edit({
      content: buildKeihiLogText({
        dateStr,
        memberMention: `${member}`,
        timestampText,
        threadMessageUrl: threadMessage.url,
        adminLogId: null,
        keihiLogId: logMessage.id,
      }),
    });

    // 6) スレッドメッセージ更新（✅ LogID=keihiLog message.id + ボタン）
    const finalEmbed = EmbedBuilder.from(initialEmbed).setFooter({
      text: `LogID: ${logMessage.id}`,
    });

    const finalButtonsRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`${STATUS_IDS.APPROVE}::${storeKey}::${thread.id}::${threadMessage.id}`)
        .setLabel('承認')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`${STATUS_IDS.MODIFY}::${storeKey}::${thread.id}::${threadMessage.id}`)
        .setLabel('修正')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`${STATUS_IDS.DELETE}::${storeKey}::${thread.id}::${threadMessage.id}`)
        .setLabel('削除')
        .setStyle(ButtonStyle.Danger),
    );

    await threadMessage.edit({ embeds: [finalEmbed], components: [finalButtonsRow] });

    // 7) 管理者ログ（① 新規）※ embedカラーは「申請=青」
    try {
      const executorName = member?.displayName || interaction.user?.username || 'unknown';

      const adminLogEmbed = buildKeihiAdminLogEmbed_Request({
        storeName,
        date: dateStr,
        department: department || '未入力',
        item: itemName || '未入力',
        amountText: `${Number(amount || 0).toLocaleString()} 円`,
        note: note || '未入力',
        requesterMention: `${member}`,
        inputTimeText: timestampText,
        threadMessageUrl: threadMessage.url,
        executorName,
        now,
      });

      // 念のため強制（adminLogEmbeds 側が未対応でも青にする）
      if (typeof adminLogEmbed?.setColor === 'function') {
        adminLogEmbed.setColor(COLORS?.BLUE ?? 0x5865f2);
      }

      // adminLogEmbeds 側で設定されるタイトルを上書きして、他アクションとフォーマットを統一
      if (adminLogEmbed) {
        adminLogEmbed.setTitle(`日付：${dateStr}`);
      }

      // 共通化された sendAdminLog を使用
      const adminLogMsg = await sendAdminLog(interaction, {
        content: `経費　申請\n店舗「${storeName}」\n日付：${dateStr} の経費申請がされました。`,
        embeds: [adminLogEmbed],
      });

      // ✅ keihiLog に AdminLogID を入れてフォーマット完成
      if (adminLogMsg?.id) {
        await logMessage.edit({
          content: buildKeihiLogText({
            dateStr,
            memberMention: `${member}`,
            timestampText,
            threadMessageUrl: threadMessage.url,
            adminLogId: adminLogMsg.id,
            keihiLogId: logMessage.id,
          }),
        });
      }
    } catch (adminErr) {
      logger.error('[keihi/request/requestModal] sendAdminLog failed', adminErr);
      // adminログ送信失敗でも keihiLog は残す（AdminLogID 空のまま）
    }

    // 8) ユーザーへの最終応答
    await interaction.editReply({
      content: `店舗「${storeName}」で経費申請を登録しました。\nスレッド: ${threadMessage.url}`,
    });

    // 15分後に自動削除（Invalid Webhook Token 対策：失敗しても無視）
    setTimeout(() => {
      interaction.deleteReply().catch(() => {});
    }, 15 * 60 * 1000);

    // 9) パネル再描画
    try {
      await refreshPanelAndSave(guild, storeKey, keihiConfig, storeRoleConfig);
    } catch (refreshErr) {
      logger.error('[keihi/request/requestModal] refreshPanelAndSave failed', refreshErr);
    }
  } catch (err) {
    logger.error('[keihi/request/requestModal] unexpected error', err);

    try {
      await interaction.editReply({
        content: '経費申請の処理中にエラーが発生しました。コンソールログを確認してください。',
      });
    } catch (replyError) {
      logger.error('[keihi/request/requestModal] failed to send error reply', replyError);
    }
  }
}

module.exports = {
  handleRequestModalSubmit,
};
