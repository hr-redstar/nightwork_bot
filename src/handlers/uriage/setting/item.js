// src/handlers/uriage/setting/item.js
// ----------------------------------------------------
// 売上の「項目」設定（拡張用スケルトン）
//   例: 売上項目のプリセットや区分を設定したい場合に利用
// ----------------------------------------------------

/**
 * 売上項目設定パネルを開く（未実装）
 * @param {import('discord.js').ButtonInteraction} interaction
 */
async function openUriageItemSetting(interaction) {
  const { MessageFlags } = require('discord.js');
  return interaction.reply({
    content: '売上項目の設定機能はまだ実装されていません。',
    flags: MessageFlags.Ephemeral,
  });
}

module.exports = {
  openUriageItemSetting,
};