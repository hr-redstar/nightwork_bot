﻿﻿﻿﻿/**
 * src/handlers/uriage/uriageBotHandler.js
 * v14 (discord.js) での interactionCreate 用ルーティングハンドラ
 * 役割：売上設定パネル・売上報告パネルに関する各種 interaction を一元的に捌く
 */

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionsBitField,
} = require('discord.js');

// ------- 依存モジュール（実装は別ファイル） --------------------
const { IDS, ROLE_FLOW } = require('./uriage/ids');
const { postUriagePanel } = require('./uriage/uriagePanel');
const { openUriageReportModal, handleReportSubmit, handleReportFixSubmit, handleApprove, handleDelete } = require('./uriage/uriageReportHandler');
const { openApproveRoleSelect, openViewRoleSelect, openApplyRoleSelect, handleRoleSelected } = require('./uriage/uriageRoleHandler');
const { postUriageReportPanel } = require('./uriage/uriagePanel_Report');
const { openCsvExportFlow, handleCsvExportSelection } = require('./uriage/uriageCsvHandler');

// （任意）ログ用埋め込みユーティリティ
// const { sendSettingLog } = require('../../utils/uriage/embedLogger');

// ------- ユーティリティ -----------------------------------------
/** 管理者 or 指定権限チェック */
function isAdminOrManageGuild(member) {
  if (!member) return false;
  return member.permissions?.has(PermissionsBitField.Flags.Administrator) ||
         member.permissions?.has(PermissionsBitField.Flags.ManageGuild);
}

/** エラー応答の共通処理 */
async function safeReply(interaction, content, ephemeral = true) {
  try {
    if (interaction.isRepliable && !interaction.replied && !interaction.deferred) {
      await interaction.reply({ content, ephemeral });
    } else if (interaction.isRepliable && interaction.deferred) {
      await interaction.editReply({ content });
    }
  } catch (e) {
    // 返信済みの場合の保険
    try { await interaction.followUp({ content, ephemeral: true }); } catch {}
  }
}

// ------- ルーティング本体 ---------------------------------------
/**
 * interactionCreate から呼ばれるメインハンドラ
 * @param {import('discord.js').Interaction} interaction
 */
async function handleUriageInteraction(interaction) {
  try {
    // ボタン
    if (interaction.isButton()) {
      const id = interaction.customId;

      // ====== 設定パネルのボタン ======
      if (id === IDS.BTN_PANEL_SETUP) {
        // 店舗 → テキストチャンネル の順にセレクトを始める
        await interaction.deferUpdate();
        return postUriageReportPanel(interaction); // 店舗別の「売上報告パネル」を設置するフロー開始
      }
      if (id === IDS.BTN_ROLE_APPROVER) {
        await interaction.deferUpdate();
        return openApproveRoleSelect(interaction, { roleFlow: ROLE_FLOW.APPROVER });
      }
      if (id === IDS.BTN_ROLE_VIEWER) {
        await interaction.deferUpdate();
        return openViewRoleSelect(interaction, { roleFlow: ROLE_FLOW.VIEWER });
      }
      if (id === IDS.BTN_ROLE_APPLICANT) {
        await interaction.deferUpdate();
        return openApplyRoleSelect(interaction, { roleFlow: ROLE_FLOW.APPLICANT });
      }
      if (id === IDS.BTN_CSV_EXPORT) {
        await interaction.deferUpdate();
        return openCsvExportFlow(interaction);
      }

      // ====== 店舗別 売上報告パネル ======
      if (id && id.startsWith && id.startsWith(IDS.BTN_REPORT_OPEN)) {
        // 売上報告モーダルを表示（customId に店舗情報が付与されていることを想定）
        return openUriageReportModal(interaction);
      }

      // ====== スレッド内 操作 ======
      if (id === IDS.BTN_APPROVE) {
        // 承認処理（承認ロール保持者のみ）
        return handleApprove(interaction);
      }
      if (id === IDS.BTN_FIX) {
        // 修正モーダルを表示（入力者 or 承認ロールのみ）
        return handleReportFixSubmit(interaction, { openOnly: true });
      }
      if (id === IDS.BTN_DELETE) {
        // 削除処理（承認者 or 管理者のみ）
        return handleDelete(interaction);
      }
    }

    // セレクトメニュー
    if (interaction.isAnySelectMenu?.() || interaction.component?.type === ComponentType.StringSelect) {
      const id = interaction.customId;

      // 店舗選択 → テキストチャンネル選択 → 設置 のフローなどは
      // 各モジュール側で customId と値を見て処理する設計にする
      if (id === IDS.SEL_STORE || id.startsWith(IDS.SEL_TEXT_CHANNEL)) {
        return postUriageReportPanel(interaction, { step: 'select' });
      }

      // 役職選択（承認/閲覧/申請兼用）
      if (id.startsWith(IDS.SEL_ROLE)) {
        return handleRoleSelected(interaction);
      }

      // CSV 範囲選択・ファイル選択
      if ([IDS.SEL_CSV_SCOPE, IDS.SEL_CSV_FILE].includes(id)) {
        return handleCsvExportSelection(interaction);
      }
    }

    // モーダル送信
    if (interaction.isModalSubmit()) {
      const id = interaction.customId;

      if (id && id.startsWith && id.startsWith(IDS.MODAL_REPORT)) {
        return handleReportSubmit(interaction); // 売上報告 新規
      }
      if (id === IDS.MODAL_FIX) {
        return handleReportFixSubmit(interaction); // 売上報告 修正
      }
    }
  } catch (err) {
    console.error('[uriageBotHandler] Error:', err);
    return safeReply(interaction, '⚠️ 売上ハンドラでエラーが発生しました。もう一度お試しください。');
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
  IDS,
  ROLE_FLOW,
  isAdminOrManageGuild,
};