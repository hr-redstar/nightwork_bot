// src/handlers/keihi/request/embedBuilders.js
const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('./colors');

function blankField() {
  return { name: '\u200b', value: '\u200b', inline: true };
}

function buildRequestEmbed({
  date,
  department,
  item,
  amount,
  note,
  requesterMention,
  inputTimeText, // <t:...:f> を推奨
  logId,
}) {
  return new EmbedBuilder()
    .setTitle('経費申請')
    .setColor(COLORS.BLUE)
    .addFields(
      // 1列目
      { name: 'ステータス', value: '📝 申請中', inline: true },
      { name: '日付', value: date || '未入力', inline: true },
      { name: '部署', value: department || '未入力', inline: true },

      // 2列目
      { name: '経費項目', value: item || '未入力', inline: true },
      { name: '金額', value: `${Number(amount || 0).toLocaleString()} 円`, inline: true },
      { name: '備考', value: note || '未入力', inline: true },

      // 3列目
      { name: '入力者', value: requesterMention || '未入力', inline: true },
      { name: '入力時間', value: inputTimeText || '未入力', inline: true },
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
    .setTimestamp(new Date())
    .setFooter({ text: `LogID: ${logId || '-'}` });
}

module.exports = { buildRequestEmbed };