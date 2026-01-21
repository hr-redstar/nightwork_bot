// src/handlers/keihi/request/adminLogEmbeds.js
// ----------------------------------------------------
// 経費：管理者ログ embed 生成
// ① 申請（新規）
// ② 修正/承認/削除（①に返信）
// 色：申請/修正=青、承認=緑、削除=赤
// ----------------------------------------------------

const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../../utils/keihi/embedLogger'); // ここはどこからでもOK

function blankField() {
  return { name: '\u200b', value: '\u200b', inline: true };
}

/**
 * ① 申請（青）
 */
function buildKeihiAdminLogEmbed_Request({
  date,
  department,
  item,
  amountText,
  note,
  requesterMention,
  inputTimeText,
  threadMessageUrl,
}) {
  return new EmbedBuilder()
    .setTitle(date ? `日付：${date} の経費申請がされました。` : '経費申請がされました。')
    .setColor(COLORS.BLUE)
    .addFields(
      // 1列目
      { name: '日付', value: date || '未入力', inline: true },
      { name: '部署', value: department || '未入力', inline: true },
      { name: '経費項目', value: item || '未入力', inline: true },
      // 2列目
      { name: '金額', value: amountText || '未入力', inline: true },
      { name: '備考', value: note || '未入力', inline: true },
      blankField(),
      // 3列目
      { name: '入力者', value: requesterMention || '未入力', inline: true },
      { name: '入力時間', value: inputTimeText || '未入力', inline: true },
      blankField(),
      // 4列目
      { name: 'スレッドメッセージリンク', value: threadMessageUrl || '未入力', inline: false },
    );
}

/**
 * ② 修正/承認/削除（色は action で変える）
 */
function buildKeihiAdminLogEmbed_Action({
  date,
  actionJa, // '修正' | '承認' | '✖️削除' など
  actorMention,
  actionTimeText,
  threadMessageUrl,
  color, // 任意。渡さなければ embedLogger の action 推定で上書きされてもOK
}) {
  return new EmbedBuilder()
    .setTitle(`日付：${date} の経費申請が${actionJa}されました。`)
    .setColor(color ?? COLORS.BLUE)
    .addFields(
      { name: `${actionJa}者`, value: actorMention || '未入力', inline: true },
      { name: `${actionJa}時間`, value: actionTimeText || '未入力', inline: true },
      blankField(),
      { name: 'スレッドメッセージリンク', value: threadMessageUrl || '未入力', inline: false },
    );
}

module.exports = {
  buildKeihiAdminLogEmbed_Request,
  buildKeihiAdminLogEmbed_Action,
};