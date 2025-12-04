// src/handlers/uriage/setting/role.js
// ----------------------------------------------------
// 売上報告の閲覧役職 / 申請役職 設定（拡張用スケルトン）
//   ※ 現状は「承認役職」は approverRoles.js で実装済み
// ----------------------------------------------------

/**
 * 売上の閲覧役職 / 申請役職 設定パネルを開く（未実装）
 * @param {import('discord.js').Interaction} interaction
 */
async function openUriageRoleSetting(interaction) {
  const { MessageFlags } = require('discord.js');
  return interaction.reply({
    content: '売上の閲覧役職 / 申請役職の設定機能はまだ実装されていません。',
    flags: MessageFlags.Ephemeral,
  });
}

module.exports = {
  openUriageRoleSetting,
};