﻿/**
 * src/handlers/uriageBotHandler.js
 * v14 (discord.js) での interactionCreate 用ルーティングハンドラ
 * 役割：売上設定パネル・売上報告パネルに関する各種 interaction を一元的に捌く
 */

const {
  PermissionsBitField,
} = require('discord.js');

// ------- 依存モジュール（実装は別ファイル） --------------------
const {
  handleUriageSettingInteraction,
} = require('./uriage/setting');
const {
  handleUriageReportInteraction,
} = require('./uriage/report');

// ------- ユーティリティ -----------------------------------------
/** 管理者 or 指定権限チェック */
function isAdminOrManageGuild(member) {
  if (!member) return false;
  return member.permissions?.has(PermissionsBitField.Flags.Administrator) ||
         member.permissions?.has(PermissionsBitField.Flags.ManageGuild);
}

// ------- ルーティング本体 ---------------------------------------
/**
 * interactionCreate から呼ばれるメインハンドラ
 * @param {import('discord.js').Interaction} interaction
 */
async function handleUriageInteraction(interaction) {
  if (!interaction.customId) return;
  const { customId } = interaction;

  // 設定系のインタラクション (パネル/ロール/CSV発行など)
  if (customId.startsWith('uriage:setting')) {
    return handleUriageSettingInteraction(interaction);
  }
  // 報告系のインタラクション (報告/承認/修正/削除など)
  if (customId.startsWith('uriage:report')) {
    return handleUriageReportInteraction(interaction);
  }
}

/**
 * The actual request is below:
 * // src/handlers/uriage/uriageBotHandler.js
 * // v14 (discord.js) での interactionCreate 用ルーティングハンドラ
 * // 役割：売上設定パネル・売上報告パネルに関する各種 interaction を一元的に捌く
 */
module.exports = {
  handleUriageInteraction,
  isAdminOrManageGuild,
};