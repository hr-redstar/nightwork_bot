// 売上関連のインタラクションを統括するハンドラ
// customId のプレフィックスを見て、各機能に処理を振り分ける
// ----------------------------------------------------
const {
  handleApproveButton,
  handleModifyButton,
  handleDeleteButton,
} = require('./report/actionStatus');

const { handleUriageSettingInteraction } = require('./setting/index');
const { handleUriageReportInteraction } = require('./report/index');
const logger = require('../../utils/logger');

/**
 * 売上関連のインタラクションをすべて処理する
 * @param {import('discord.js').Interaction} interaction
 */
async function handleUriageInteraction(interaction) {
  logger.debug(`[uriage/index] customId=${interaction.customId || ''}`);

  if (!interaction.customId) return;

  const { customId } = interaction;

  // 設定系のインタラクション (パネル/ロール/CSV発行など)
  if (customId.startsWith('uriage_setting') || customId.startsWith('uriage_config') || customId.startsWith('uriage:setting')) {
    return handleUriageSettingInteraction(interaction);
  }

  // 報告系のインタラクション (報告/承認/修正/削除など)
  if (customId.startsWith('uriage_report') || customId.startsWith('uriage:report')) {
    return handleUriageReportInteraction(interaction);
  }

  // 新しい共通ボタン形式のルーティング
  const parts = customId.split(':');
  if (parts[0] === 'uriage' && parts.length === 3) {
    const [feature, action, targetId] = parts;

    // actionStatus.js のハンドラは storeId を customId から取得するため、
    // 一時的に古い形式の customId を模倣して呼び出す。
    // 将来的に actionStatus.js が interaction のコンテキストから storeId を
    // 取得するようになれば、この模倣は不要になる。
    interaction.customId = `uriage_report_status:${action}::dummyStoreId::${targetId}`;

    switch (action) {
      case 'approve':
        return handleApproveButton(interaction);
      case 'edit':
        return handleModifyButton(interaction);
      case 'delete':
        return handleDeleteButton(interaction);
    }
  }
}

module.exports = {
  handleUriageInteraction,
};
