// src/handlers/uriage/setting/uriagePanel_setting.js
// ----------------------------------------------------
// 売上設定用パネル（拡張バージョン）のスケルトン
//   例: 店舗別の詳細設定パネルやタブ分けしたUIなどを作る場合に利用
// ----------------------------------------------------

/**
 * 売上の詳細設定パネルを表示（未実装）
 * @param {import('discord.js').Interaction} interaction
 */
async function sendUriageSettingDetailPanel(interaction) {
  const { MessageFlags } = require('discord.js');
  return interaction.reply({
    content: '売上の詳細設定パネル機能はまだ実装されていません。',
    flags: MessageFlags.Ephemeral,
  });
}

module.exports = {
  sendUriageSettingDetailPanel,
};