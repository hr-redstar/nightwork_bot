// src/handlers/uriage/setting/store.js
// ----------------------------------------------------
// 売上設定の「店舗別設定」用ヘルパー（拡張用スケルトン）
// ----------------------------------------------------

/**
 * 店舗別の売上設定パネルを開く（未実装）
 * @param {import('discord.js').ButtonInteraction} interaction
 */
async function openUriageStoreSetting(interaction) {
  const { MessageFlags } = require('discord.js');
  return interaction.reply({
    content: '売上の店舗別設定機能はまだ実装されていません。',
    flags: MessageFlags.Ephemeral,
  });
}

module.exports = {
  openUriageStoreSetting,
};