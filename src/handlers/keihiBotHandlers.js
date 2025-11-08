﻿// src/handlers/keihiBotHandler.js
const { MessageFlags } = require('discord.js');
const {
  handleKeihiPanelAction,
  handleRoleSelectSubmit,
  handleStoreSelectForPanel,
  handleChannelSelectForPanel,
} = require('./keihi/keihiPanel_actions');
const { handleKeihiItemRegister, handleKeihiItemSelect, handleKeihiItemModal } = require('./keihi/keihiItemHandler');
const { handleKeihiRequest, handleKeihiRequestSelect, handleKeihiRequestModal } = require('./keihi/keihiRequestHandler');
const { handleKeihiApprove, handleKeihiEdit, handleKeihiEditModal, handleKeihiDelete } = require('./keihi/keihiApproveHandler');
const { handleKeihiCsvExport, handleKeihiCsvSelect } = require('./keihi/keihiExportHandler');

/**
 * 経費関連イベントを処理するメインディスパッチャー
 * @param {Interaction} interaction
 */
async function handleInteraction(interaction) {
  try {
    if (interaction.isButton()) {
      const id = interaction.customId;

      // 経費設定系
      if (id.startsWith('keihi_set_')) {
        return handleKeihiPanelAction(interaction);
      }

      // 💾 経費CSV出力
      if (id === 'keihi_export_csv') {
        return handleKeihiCsvExport(interaction);
      }

      // 経費項目登録
      if (id.startsWith('keihi_item_register_')) {
        return handleKeihiItemRegister(interaction);
      }

      // 経費申請
      if (id.startsWith('keihi_request_')) {
        return handleKeihiRequest(interaction);
      }

      // 承認・修正・削除
      switch (id) {
        case 'keihi_approve':
          return handleKeihiApprove(interaction);
        case 'keihi_edit':
          return handleKeihiEdit(interaction);
        case 'keihi_delete':
          return handleKeihiDelete(interaction);
      }
      return;
    }

    if (interaction.isStringSelectMenu()) {
      const id = interaction.customId;
      if (id === 'keihi_csv_select_month') return handleKeihiCsvSelect(interaction);
      if (id === 'keihi_item_select_store') return handleKeihiItemSelect(interaction);

      // 設定パネルの選択肢
      if (id.startsWith('keihi_select_role_')) return handleRoleSelectSubmit(interaction);
      if (id === 'keihi_select_store') return handleStoreSelectForPanel(interaction);

      if (id.startsWith('keihi_request_select_')) return handleKeihiRequestSelect(interaction);
      return;
    }

    if (interaction.isModalSubmit()) {
      const id = interaction.customId;

      // 経費項目登録モーダル
      if (id.startsWith('keihi_item_modal_')) return handleKeihiItemModal(interaction);

      // 経費申請モーダル
      if (id.startsWith('keihi_request_modal_')) return handleKeihiRequestModal(interaction);

      // 修正モーダル
      if (id.startsWith('keihi_edit_modal_')) return handleKeihiEditModal(interaction);
      return;
    }

    if (interaction.isChannelSelectMenu()) {
      const id = interaction.customId;
      if (id.startsWith('keihi_select_channel_')) return handleChannelSelectForPanel(interaction);
      return;
    }
  } catch (err) {
    console.error('❌ keihiBotHandler エラー:', err);
    if (!interaction.replied) {
      await interaction.reply({
        content: '⚠️ 経費処理中にエラーが発生しました。',
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}

module.exports = { handleInteraction };
