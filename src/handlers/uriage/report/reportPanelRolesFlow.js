// src/handlers/uriage/report/reportPanelRolesFlow.js
// ----------------------------------------------------
// 売上報告パネルの役職設定フロー（未実装のプレースホルダ）
//   - uriage/report/index.js から require されるためのダミー
//   - 実装がまだの場合でもモジュールエラーを防ぐ目的
// ----------------------------------------------------

/**
 * @param {import('discord.js').Interaction} interaction
 */
async function handleReportPanelRolesFlow(interaction) {
  // TODO: 必要に応じて実装
  if (!interaction.replied && !interaction.deferred) {
    await interaction.reply({
      content: 'この機能はまだ実装されていません。',
      ephemeral: true,
    }).catch(() => {});
  }
}

module.exports = {
  handleReportPanelRolesFlow,
};
