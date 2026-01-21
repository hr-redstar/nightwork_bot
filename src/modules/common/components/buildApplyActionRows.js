// modules/common/components/buildApplyActionRows.js
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

/**
 * 申請・報告 共通ボタン
 */
function buildApplyActionRows({
  feature,   // 'uriage' | 'keihi' | 'kpi'
  targetId,  // 申請ID / スレッドID 等
  options = {},
}) {
  const rows = [];

  // --- 管理者 / 承認者 ---
  rows.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`${feature}:approve:${targetId}`)
        .setLabel('承認')
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId(`${feature}:edit:${targetId}`)
        .setLabel('修正')
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId(`${feature}:delete:${targetId}`)
        .setLabel('削除')
        .setStyle(ButtonStyle.Danger)
    )
  );

  // --- 申請者向け ---
  if (!options.hideApplicantActions) {
    rows.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`${feature}:reapply:${targetId}`)
          .setLabel('修正して再申請')
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId(`${feature}:cancel:${targetId}`)
          .setLabel('取り下げ')
          .setStyle(ButtonStyle.Secondary)
      )
    );
  }

  return rows;
}

module.exports = { buildApplyActionRows };