// src/handlers/syutBotHandler.js
const { showSetupMenus, handleSetupSubmit, reflectSelectedStore } = require('./syut/syutPanel_config');
const { showRoleLink, saveRoleLink } = require('./syut/syutRoleConfig');
const { showRegModal, handleModal: handleSyutModal } = require('./syut/syutAttendanceModal');
const { updateCastPanel } = require('./syut/syutCastPanel'); // Import updateCastPanel
const { handleModal: handleSyutModal } = require('./syut/syutAttendanceHandler');
const { showTodayCastSetup, sendTodayCast } = require('./syut/syutTodayCast');
const { updateBlackPanel } = require('./syut/syutBlackPanel'); // Import updateBlackPanel
const { startCsvExport, selectMonth, outputCsv } = require('./syut/syutCsv');

async function handleSyutInteractions(interaction) {
  // ボタン
  if (interaction.isButton()) {
    const id = interaction.customId;

    // 設定パネル設置は既存の /設定出退勤 コマンドで postSyutPanel() 呼び出し
    if (id === 'syut_csv_export') return startCsvExport(interaction);

    if (id === 'syut_cast_setup') return showSetupMenus(interaction, 'cast');
    if (id === 'syut_black_setup') return showSetupMenus(interaction, 'black');

    // キャストパネルのサブ操作
    if (id.startsWith('cast_role_link_')) {
      const store = id.replace('cast_role_link_', '');
      return showRoleLink(interaction, 'cast', store);
    }
    if (id.startsWith('cast_reg_')) {
      const store = id.replace('cast_reg_', '');
      // 選択ユーザーUIは省略：ここでは手早くモーダル（select系）
      return showRegModal(interaction, 'cast', store, false);
    }
    if (id.startsWith('cast_manual_')) {
      const store = id.replace('cast_manual_', '');
      return showRegModal(interaction, 'cast', store, true);
    }
    if (id.startsWith('cast_today_setup_')) {
      const store = id.replace('cast_today_setup_', '');
      return showTodayCastSetup(interaction, store);
    }

    // 黒服パネルのサブ操作
    if (id.startsWith('black_role_link_')) {
      const store = id.replace('black_role_link_', '');
      return showRoleLink(interaction, 'black', store);
    }
    if (id.startsWith('black_reg_')) {
      const store = id.replace('black_reg_', '');
      return showRegModal(interaction, 'black', store, false);
    }
    if (id.startsWith('black_manual_')) {
      const store = id.replace('black_manual_', '');
      return showRegModal(interaction, 'black', store, true);
    }
  }

  // セレクト
  if (interaction.isStringSelectMenu()) {
    const id = interaction.customId;

    if (id === 'syut_csv_store_select') {
      const store = interaction.values[0];
      return selectMonth(interaction, store);
    }

    // 店舗/チャンネル選択→設置
    if (id === 'syut_select_store_cast' || id === 'syut_select_store_black') {
      const kind = id.endsWith('_cast') ? 'cast' : 'black';
      return reflectSelectedStore(interaction, kind);
    }
    if (id === 'syut_select_channel_cast' || id === 'syut_select_channel_black') {
      const kind = id.endsWith('_cast') ? 'cast' : 'black';
      const storeSelect = interaction.message.components[0].components[0];
      const storeName = (storeSelect.options.find(o=>o.default)?.value) || storeSelect.options[0].value;
      const channelId = interaction.values[0];
      return handleSetupSubmit(interaction, kind, storeName, channelId);
    }

    // 役職/ロール設定の保存
    if (id.startsWith('syut_pos_select_')) {
      // 保存はロール選択時にまとめる
      return;
    }
    if (id.startsWith('syut_role_select_')) {
      const [, , kind, store] = id.split('_'); // syut_role_select_(cast|black)_STORE
      const posMenu = interaction.message.components[0].components[0];
      const position = (posMenu.options.find(o=>o.default)?.value) || posMenu.options[0].value;
      return saveRoleLink(interaction, kind, store, position, interaction.values);
    }

    // 本日のキャスト：送信先選択後に送信（時刻は要件最小で固定 or 文字列で保存）
    if (id.startsWith('cast_today_select_')) {
      const store = id.replace('cast_today_select_', '');
      const channelId = interaction.values[0];
      return sendTodayCast(interaction, store, channelId, '13:00'); // とりあえず 13:00 固定で保存＆送信
    }
  }

  // モーダル
  if (interaction.isModalSubmit() && interaction.customId.startsWith('syut_modal_')) {
    const [, , , kind, store] = interaction.customId.split('_');
    await handleSyutModal(interaction);

    // パネルを更新
    if (kind === 'cast') {
      await updateCastPanel(interaction.guild, store, interaction.channelId);
    } else {
      await updateBlackPanel(interaction.guild, store, interaction.channelId);
    }
  }
}

module.exports = { handleSyutInteractions };