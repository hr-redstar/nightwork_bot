// src/handlers/keihi/request/itemConfig.js
// ----------------------------------------------------
// 経費「経費項目登録」モーダル表示 & 保存
// ----------------------------------------------------

const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  MessageFlags,
} = require('discord.js');

const {
  loadKeihiConfig,
  saveKeihiConfig,
  loadKeihiStoreConfig,
  saveKeihiStoreConfig,
} = require('../../../utils/keihi/keihiConfigManager');
const { loadStoreRoleConfig } = require('../../../utils/config/storeRoleConfigManager');
const { sendSettingLog } = require('../../../utils/config/configLogger');
const { upsertStorePanelMessage } = require('./panel');
const { IDS: KEIHI_IDS } = require('./ids');

// ----------------------------------------------------
// ボタン押下 → モーダル表示
// ----------------------------------------------------
/**
 * 「経費項目登録」ボタン押下時にモーダルを表示
 * @param {import('discord.js').ButtonInteraction} interaction
 * @param {string} storeId
 */
async function openItemConfigModal(interaction, storeId) {
  const modal = new ModalBuilder()
    .setCustomId(`${KEIHI_IDS.PREFIX.ITEM_CONFIG_MODAL}::${storeId}`)
    .setTitle(`経費項目登録：${storeId}`);

  const input = new TextInputBuilder()
    .setCustomId('items')
    .setLabel('経費項目（1行につき1項目）')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setPlaceholder(
      '例：\n① 交通費 タクシー代、電車・バス代、営業移動費、配達交通費など\n'
      + '② 備品・消耗品費 名刺、文房具、バインダー、店舗備品、のぼり、テープ、電池など\n…',
    );

  const row = new ActionRowBuilder().addComponents(input);
  modal.addComponents(row);

  await interaction.showModal(modal);
}

// ----------------------------------------------------
// モーダル送信 → 保存 & パネル更新
// ----------------------------------------------------
/**
 * 経費項目モーダル送信時の処理
 * @param {import('discord.js').ModalSubmitInteraction} interaction
 */
async function handleItemConfigModalSubmit(interaction) {
  const customId = interaction.customId; // keihi_request_item_config_modal::店舗名

  // ["keihi_request_item_config_modal", "外部IT会社"] の形
  const [prefix, storeId] = customId.split('::');

  if (prefix !== KEIHI_IDS.PREFIX.ITEM_CONFIG_MODAL || !storeId) {
    return; // 想定外なら何もしない
  }

  const guild = interaction.guild;
  const guildId = guild.id;

  // 3秒制限回避
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const rawText = interaction.fields.getTextInputValue('items') || '';
  const items = rawText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  // 設定読み込み
  const [keihiConfig, storeRoleConfig, oldStoreConfig] = await Promise.all([
    loadKeihiConfig(guildId),
    loadStoreRoleConfig(guildId).catch(() => null),
    loadKeihiStoreConfig(guildId, storeId).catch(() => ({})),
  ]);

  if (!keihiConfig.panels) keihiConfig.panels = {};
  if (!keihiConfig.panels[storeId]) {
    keihiConfig.panels[storeId] = {
      channelId: null,
      messageId: null,
      viewRoleIds: [],
      requestRoleIds: [],
      items: [],
    };
  }

  const beforeItems = Array.isArray(keihiConfig.panels[storeId].items)
    ? keihiConfig.panels[storeId].items
    : [];

  // グローバル keihi/config.json に保存
  keihiConfig.panels[storeId].items = items;
  await saveKeihiConfig(guildId, keihiConfig);

  // 店舗別 config (GCS/ギルドID/keihi/店舗名/config.json) にも保存
  const storeConfig = oldStoreConfig || {};
  storeConfig.storeId = storeId;
  storeConfig.items = items;
  await saveKeihiStoreConfig(guildId, storeId, storeConfig);

  // 店舗別経費申請パネルを更新
  await upsertStorePanelMessage(guild, storeId, keihiConfig, storeRoleConfig);

  // 変更差分ログ
  const added = items.filter((i) => !beforeItems.includes(i));
  const removed = beforeItems.filter((i) => !items.includes(i));

  let desc = `店舗「${storeId}」の経費項目を更新しました。\n`;
  if (added.length) {
    desc += `\n**追加:**\n${added.map((i) => `・${i}`).join('\n')}`;
  }
  if (removed.length) {
    desc += `\n\n**削除:**\n${removed.map((i) => `・${i}`).join('\n')}`;
  }

  await sendSettingLog(interaction, {
    title: '経費項目設定',
    description: desc,
  });

  await interaction.editReply({
    content: '経費項目を更新しました。',
  });
}

module.exports = {
  openItemConfigModal,
  handleItemConfigModalSubmit,
};
