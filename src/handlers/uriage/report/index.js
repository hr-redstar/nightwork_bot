const { IDS } = require('../setting/ids');
const {
  openUriageReportModal,
  handleUriageReportModalSubmit,
  openUriageEditModal,
  handleUriageEditModalSubmit,
} = require('./requestFlow');
const { handleStatusButton } = require('./statusActions'); // まだ未実装なら TODO でOK

/**
 * 売上報告系のインタラクション振り分け
 * @param {import('discord.js').Interaction} interaction
 */
async function handleInteraction(interaction) {
  // ボタン
  if (interaction.isButton()) {
    // 売上報告モーダルを開く
    if (interaction.customId === IDS.BUTTON.REPORT_OPEN) {
      return openUriageReportModal(interaction);
    }

    // 承認 / 修正 / 削除 などステータス系
    if (
      interaction.customId === 'uriage_report_status_approve' ||
      interaction.customId === 'uriage_report_status_edit' ||
      interaction.customId === 'uriage_report_status_delete'
    ) {
      return handleStatusButton(interaction);
    }
  }

  // モーダル送信
  if (interaction.isModalSubmit()) {
    const baseId = interaction.customId.split(':')[0];

    if (baseId === IDS.MODAL.REPORT) {
      return handleUriageReportModalSubmit(interaction);
    }

    // 修正モーダルの送信ハンドラ
    if (baseId === IDS.MODAL.EDIT) {
      return handleUriageEditModalSubmit(interaction);
    }
  }
}

module.exports = {
  handleInteraction,
};
