// src/handlers/uriage/report/index.js
// 売上報告まわりの router

const { MessageFlags } = require('discord.js');
const logger = require('../../../utils/logger');
const { handleReportButton, handleReportModal } = require('./reportFlow');
const {
  handleApproveButton,
  handleModifyButton,
  handleDeleteButton,
  handleModifyModal,
} = require('./actionStatus');
const rolesButtons = require('./rolesButtons');

// プロセスIDとファイル読み込みの確認（二重起動チェック用）
logger.info(`[BOOT_ID] PID:${process.pid} Loading ${__filename}`);

// 起動時に一度だけ中身を確認（これで「本当にどのファイル/exportsを読んでるか」分かる）
logger.debug('[uriage/report] rolesButtons exports:', {
  keys: Object.keys(rolesButtons || {}),
  viewType: typeof rolesButtons?.handleViewRolesButton,
  requestType: typeof rolesButtons?.handleRequestRolesButton,
});

/**
 * 売上報告ボタン/モーダルのディスパッチ
 * @param {import('discord.js').Interaction} interaction
 */
async function handleUriageReportInteraction(interaction) {
  try {
    if (!interaction) return;

    // 実行中のプロセスIDを記録（もしボタンを押してもこのログが出なければ、古いプロセスが反応しています）
    logger.debug(`[EXEC_ID] PID:${process.pid} Handling uriage_report: ${interaction.customId}`);

    const customId = interaction.customId || '';

    // 既存のステータス変更ボタン (uriage_report_status)
    if (customId.startsWith('uriage_report_status:')) {
      if (customId.startsWith('uriage_report_status:approve')) return handleApproveButton(interaction);
      if (customId.startsWith('uriage_report_status:modify')) return handleModifyButton(interaction);
      if (customId.startsWith('uriage_report_status:delete')) return handleDeleteButton(interaction);
      return;
    }

    // uriage_report 系
    const parts = customId.split(':');
    // 最低限 uriage_report:kind:action はあるはず
    if (parts.length < 3) return;

    const feature = parts[0];
    const kind = parts[1];
    const action = parts[2];
    const storeName = parts.slice(3).join(':');

    if (feature !== 'uriage_report') return;

    if (interaction.isButton() && kind === 'btn') {
      switch (action) {
        case 'view_roles':
          if (typeof rolesButtons?.handleViewRolesButton !== 'function') {
            logger.error('[uriage/report] handleViewRolesButton missing', rolesButtons);
            return interaction.reply({ flags: MessageFlags.Ephemeral, content: 'view_roles(Button) ハンドラ未定義' });
          }
          return rolesButtons.handleViewRolesButton(interaction, storeName);

        case 'request_roles':
          if (typeof rolesButtons?.handleRequestRolesButton !== 'function') {
            logger.error('[uriage/report] handleRequestRolesButton missing', rolesButtons);
            return interaction.reply({ flags: MessageFlags.Ephemeral, content: 'request_roles(Button) ハンドラ未定義' });
          }
          return rolesButtons.handleRequestRolesButton(interaction, storeName);

        case 'report':
          return handleReportButton(interaction);
        default:
          return;
      }
    }

    if (interaction.isAnySelectMenu() && kind === 'sel') {
      switch (action) {
        case 'view_roles':
          if (typeof rolesButtons?.handleViewRolesSelect !== 'function') {
            logger.error('[uriage/report] handleViewRolesSelect missing', rolesButtons);
            return interaction.reply({ flags: MessageFlags.Ephemeral, content: 'view_roles(Select) ハンドラ未定義' });
          }
          return rolesButtons.handleViewRolesSelect(interaction, storeName);

        case 'request_roles':
          if (typeof rolesButtons?.handleRequestRolesSelect !== 'function') {
            logger.error('[uriage/report] handleRequestRolesSelect missing', rolesButtons);
            return interaction.reply({ flags: MessageFlags.Ephemeral, content: 'request_roles(Select) ハンドラ未定義' });
          }
          return rolesButtons.handleRequestRolesSelect(interaction, storeName);

        default:
          return;
      }
    }

    if (interaction.isModalSubmit() && kind === 'modal') {
      // 修正モーダル (uriage_report:modal:modify:...)
      if (action === 'modify') {
        return handleModifyModal(interaction);
      }
      return handleReportModal(interaction);
    }
  } catch (err) {
    logger.error('[uriage/report] ルートエラー:', err);
    throw err;
  }
}

module.exports = {
  handleUriageReportInteraction,
};
