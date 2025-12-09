// 売上関連のインタラクションを統括するハンドラ
// customId のプレフィックスを見て、各機能に処理を振り分ける
// ----------------------------------------------------

const { handleUriageSettingInteraction } = require('./setting/index');
const { handleInteraction: handleUriageReportInteraction } = require('./report/index');

/**
 * 売上関連のインタラクションをすべて処理する
 * @param {import('discord.js').Interaction} interaction
 */
async function handleUriageInteraction(interaction) {
  if (!interaction.customId) return;

  const { customId } = interaction;

  // 設定系のインタラクション (パネル/ロール/CSV発行など)
  if (customId.startsWith('uriage:setting') || customId.startsWith('uriage_config')) {
    return handleUriageSettingInteraction(interaction);
  }

  // 報告系のインタラクション (報告/承認/修正/削除など)
  if (customId.startsWith('uriage:report')) {
    return handleUriageReportInteraction(interaction);
  }
}

module.exports = {
  handleUriageInteraction,
};
