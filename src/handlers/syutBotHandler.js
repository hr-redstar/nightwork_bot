// src/handlers/syutBotHandler.js
const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  EmbedBuilder,
  MessageFlags,
} = require('discord.js');
const { handleSyutKuro } = require('./syut/syutHandler_Kuro');
const { handleSyutCast } = require('./syut/syutHandler_Cast');
const { readJson } = require('../utils/gcs');
const { showSetupMenus, handleSetupSubmit, reflectSelectedStore, showChannelSelect } = require('./syut/syutPanel_config');
const { showRoleLink, saveRoleLink, showRoleSelectForPosition } = require('./syut/syutRoleConfig');
const { showRegModal } = require('./syut/syutAttendanceModal');
const { updateCastPanelMessage } = require('./syut/syutPanel_Cast');
const { showTodayCastSetup, sendTodayCast } = require('./syut/syutTodayCast');
const { updateBlackPanel } = require('./syut/syutPanel_Kuro'); // Import updateBlackPanel
const { startCsvExport, selectMonth, outputCsv } = require('./syut/syutCsv');
const {
  getSyutConfig,
  saveSyutConfig,
  getDailySyuttaikin,
  saveDailySyuttaikin,
} = require('../utils/syut/syutConfigManager');

// --- 店舗_役職_ロール.json のパス ---
function getRoleConfigPath(guildId) {
  return `GCS/${guildId}/config/店舗_役職_ロール.json`;
}

async function handleSyutInteractions(interaction) {
  const { customId } = interaction;

  // すべてのキャスト関連インタラクションを新しいハンドラに委譲
  if (customId.startsWith('cast_')) {
    return handleSyutCast(interaction);
  }

  // すべての黒服関連インタラクションを新しいハンドラに委譲
  if (customId.startsWith('kuro_')) {
    return handleSyutKuro(interaction);
  }

  if (interaction.isButton()) {
    // --- メイン設定パネルのボタン ---
    if (customId === 'syut_csv_export') return startCsvExport(interaction);
  }

  if (interaction.isStringSelectMenu()) {
    const id = interaction.customId;

    // === 役職選択後 保存 ===
    if (interaction.customId.startsWith('role_select:')) {
      const [, storeName, type] = interaction.customId.split(':');
      const roleName = interaction.values[0];
      const config = await getSyutConfig(interaction.guild.id);

      config[`${type}PanelList`] ||= {};
      config[`${type}PanelList`][storeName] ||= {};
      config[`${type}PanelList`][storeName].role = roleName;

      await saveSyutConfig(interaction.guild.id, config);

      return interaction.update({
        content: `✅ 店舗「${storeName}」の${type === 'cast' ? 'キャスト' : '黒服'}役職を「${roleName}」に設定しました。`,
        components: [],
      });
    }

    if (id === 'syut_csv_store_select') {
      const store = interaction.values[0];
      return selectMonth(interaction, store);
    }

    // 店舗選択後 → チャンネル選択
    if (id.startsWith('syut_select_store:')) {
      const [, kind] = id.split(':');
      const storeName = interaction.values[0];
      return showChannelSelect(interaction, kind, storeName);
    }

    // 役職/ロール設定の保存
    if (id.startsWith('syut_pos_select_')) {
      const [, , , kind, store] = id.split('_');
      const position = interaction.values[0];
      await showRoleSelectForPosition(interaction, kind, store, position);
      return;
    }
    if (id.startsWith('syut_role_select_')) {
      const [, , kind, store] = id.split('_'); // syut_role_select_(cast|black)_STORE
      const posMenu = interaction.message.components[0].components[0];
      const position = (posMenu.options.find(o=>o.default)?.value) || posMenu.options[0].value;
      return saveRoleLink(interaction, kind, store, position, interaction.values);
    }
  }

  // パネル設置フローのチャンネル選択
  if (interaction.isChannelSelectMenu() && interaction.customId.startsWith('syut_select_channel:')) {
    const [, kind, storeName] = interaction.customId.split(':');
    const channelId = interaction.values[0];
    return handleSetupSubmit(interaction, kind, storeName, channelId);
  }

  // モーダル
  if (interaction.isModalSubmit()) {
    if (interaction.customId.startsWith('syut_modal_')) {
      const [, , , kind, store] = interaction.customId.split('_');
      // await handleSyutModal(interaction); // handleModalは未定義のためコメントアウト
    }
  }
}

module.exports = { handleSyutInteractions };