// src/handlers/uriage/setting/panel.js
// ----------------------------------------------------
// 売上設定パネル表示
// ----------------------------------------------------

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
} = require('discord.js');

const { IDS } = require('./ids');
const {
  loadUriageConfig,
} = require('../../../utils/uriage/uriageConfigManager');
const {
  loadStoreRoleConfig,
} = require('../../../utils/config/storeRoleConfigManager');
const {
  createSettingPanelEmbed,
} = require('../../../utils/embedPanel');

/**
 * 売上設定パネルの Embed を構築
 * @param {object} config - uriage/config.json の内容
 * @param {object} storeRoleConfig - 店舗_役職_ロール.json の内容
 * @returns {import('discord.js').EmbedBuilder}
 */
function buildUriageSettingEmbed(config, storeRoleConfig) {
  const fields = [];

  const stores = storeRoleConfig?.stores ?? [];
  const storeMap = new Map(stores.map((s) => [String(s.id ?? s.name), String(s.name ?? '店舗')]));
  const panels = config?.panels ?? {};
  const setupStoreKeys = Object.keys(panels || {});

  // 1) パネル設置一覧（複数行で表示）
  if (setupStoreKeys.length > 0) {
    const lines = [];
    for (const storeKey of setupStoreKeys) {
      const panelInfo = panels[storeKey] ?? {};
      if (!panelInfo.channelId) continue;
      const storeName = storeMap.get(storeKey) || storeKey;
      lines.push(`・${storeName}：${panelInfo.panelTitle || '売上報告 パネル'}`);
    }
    fields.push({ name: '📋 売上パネル設置一覧', value: lines.join('\n') || '未登録', inline: false });
  } else {
    fields.push({
      name: '📋 売上パネル設置一覧',
      value: '未登録\n下の「売上報告パネル設置」ボタンから設定を開始してください。',
      inline: false,
    });
  }

  // 2) 承認役職
  const approverLines = [];
  for (const storeKey of setupStoreKeys) {
    const panelInfo = panels[storeKey] ?? {};
    const approverRoleIds = Array.isArray(panelInfo.approverRoleIds) ? panelInfo.approverRoleIds : [];
    const approverRoles = approverRoleIds.length > 0 ? approverRoleIds.map((id) => `<@&${id}>`).join(' / ') : '未設定';
    const storeName = storeMap.get(storeKey) || storeKey;
    approverLines.push(`・${storeName}：${approverRoles}`);
  }
  fields.push({ name: '🛡️ 承認役職', value: approverLines.length ? approverLines.join('\n') : '未設定', inline: false });

  // 3) CSV 出力（説明と更新時刻）
  const updatedAt = config?.updatedAt || '未更新';
  fields.push({ name: '📊 売上CSV出力', value: '期間: 年月日 / 年月 / 年 / 四半期\n更新: ' + updatedAt, inline: false });

  return createSettingPanelEmbed('💰 売上設定パネル', fields);
}

/**
 * 売上設定パネルのコンポーネント（ボタン）を構築
 * @returns {import('discord.js').ActionRowBuilder[]}
 */
function buildUriageSettingComponents() {
  // 1行目: 売上報告パネル設置 / 承認役職
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(IDS.BTN_OPEN_PANEL_LOCATION)
      .setLabel('売上報告パネル設置')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(IDS.BTN_OPEN_APPROVER_ROLE)
      .setLabel('承認役職')
      .setStyle(ButtonStyle.Secondary),
  );

  // 2行目: 売上csv発行
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(IDS.BTN_OPEN_CSV_EXPORT)
      .setLabel('売上csv発行')
      .setStyle(ButtonStyle.Success),
  );

  return [row1, row2];
}

/**
 * 売上設定パネルを表示
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 */
async function sendUriageSettingPanel(interaction) {
  const guildId = interaction.guild.id;

  const [config, storeRoleConfig] = await Promise.all([
    loadUriageConfig(guildId),
    loadStoreRoleConfig(guildId),
  ]);

  const embed = buildUriageSettingEmbed(config, storeRoleConfig);
  const components = buildUriageSettingComponents();

  const payload = {
    embeds: [embed],
    components,
  };

  // /設定売上 側で deferReply してるので、基本 followUp になる
  if (interaction.deferred || interaction.replied) {
    return interaction.followUp(payload);
  }
  return interaction.reply(payload);
}

module.exports = {
  sendUriageSettingPanel,
};
