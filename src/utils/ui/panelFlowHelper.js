// src/utils/ui/panelFlowHelper.js
// ----------------------------------------------------
// 店舗パネル設置 / 役職選択 → 権限付与 の共通フロー
// ----------------------------------------------------

const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
  MessageFlags,
  PermissionsBitField,
} = require('discord.js');
const { loadStoreRoleConfig } = require('../config/storeRoleConfigManager');

// ----------------------------------------------------
// 🏪 店舗セレクト (最初の一歩)
// ----------------------------------------------------
/**
 * パネル設置フローの1歩目:
 * 「店舗を選んでください」セレクトを出す共通処理
 *
 * customId の例:
 *   keihi:config:select:store
 *   uriage:config:select:store
 */
async function showStoreSelectForPanel(interaction, {
  customId,
  placeholder = '店舗を選択してください',
  emptyMessage = '⚠️ 店舗が登録されていません。設定パネルで追加してください。',
  content = '🏪 パネルを設置する店舗を選んでください。',
} = {}) {
  const storeRoleConfig = await loadStoreRoleConfig(interaction.guildId);
  const stores = storeRoleConfig.stores || [];

  if (!stores.length) {
    return interaction.reply({
      content: emptyMessage,
      flags: MessageFlags.Ephemeral,
    });
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder(placeholder)
    .addOptions(stores.slice(0, 25).map((s) => ({
      label: s,
      value: s,
    })));

  const row = new ActionRowBuilder().addComponents(select);

  return interaction.reply({
    content,
    components: [row],
    flags: MessageFlags.Ephemeral,
  });
}

// ----------------------------------------------------
// 🏪 店舗選択後 → チャンネルセレクト
// ----------------------------------------------------
/**
 * 店舗が選択されたあと、
 * 「どのチャンネルにその店舗のパネルを出すか？」の
 * チャンネルセレクトを出す共通処理。
 *
 * customId 例:
 *   keihi:config:select:channel:<店舗名>
 */
async function handleStoreSelectedForPanel(interaction, {
  featureKey, // 'keihi' / 'uriage' / 'kpi' など
  promptPrefix = '',
} = {}) {
  const selectedStore = interaction.values[0];

  const chSelect = new ChannelSelectMenuBuilder()
    .setCustomId(`${featureKey}:config:select:channel:${selectedStore}`)
    .setPlaceholder('パネルを設置するチャンネルを選択')
    .addChannelTypes(ChannelType.GuildText);

  const row = new ActionRowBuilder().addComponents(chSelect);

  await interaction.update({
    content: `${promptPrefix}${selectedStore} のパネルを設置するチャンネルを選択してください：`,
    components: [row],
  });
}

// ----------------------------------------------------
// 🏪 チャンネル選択後 → パネル送信 & config 保存
// ----------------------------------------------------
/**
 * チャンネルが選択されたあと、
 *   1. 機能ごとの config に (店舗→チャンネル) を保存
 *   2. 対象チャンネルに店舗パネルを送信
 *   3. （あれば）ログ出力
 *
 * ※ 機能ごとの処理はコールバックで渡す
 */
async function handleChannelSelectedForPanel(interaction, {
  featureLabel = 'パネル',          // メッセージ用ラベル（例: '経費パネル', '売上パネル'）
  loadFeatureConfig,               // async (guildId) => config
  saveFeatureConfig,               // async (guildId, config) => void
  postStorePanel,                  // async (channel, storeName, guildId) => void
  logConfigChange,                 // async ({ interaction, storeName, channelId }) => void (任意)
} = {}) {
  await interaction.deferUpdate();

  const guildId = interaction.guildId;
  const guild = interaction.guild;
  const selectedStore = interaction.customId.split(':')[4]; // keihi:config:select:channel:<store>
  const channelId = interaction.values[0];
  const channel = guild.channels.cache.get(channelId);

  // 1. 機能ごとの config に保存
  const config = await loadFeatureConfig(guildId);
  config.panels = config.panels || {}; // panelsプロパティを初期化
  config.panels[selectedStore] = {
      ...(config.panels[selectedStore] || {}),
      channelId: channelId,
  };
  await saveFeatureConfig(guildId, config);

  // 2. 実際のパネル送信（各機能ごとの処理）
  await postStorePanel(channel, selectedStore, guildId);

  // 3. ログ出力（任意）
  if (logConfigChange) {
    await logConfigChange({ interaction, storeName: selectedStore, channelId });
  }

  // 4. ユーザーへの確認メッセージ
  await interaction.followUp({
    content: `✅ ${selectedStore} の${featureLabel}を <#${channelId}> に設置しました。`,
    ephemeral: true,
  });
}

// ----------------------------------------------------
// 👥 役職セレクト表示（ボタン押下 → 役職一覧）
// ----------------------------------------------------
/**
 * 機能ごとの「承認役職 / 閲覧役職 / 申請役職」ボタン押下時に、
 * 共通の役職セレクトメニューを出す処理。
 *
 * 例:
 *   customId: keihi:config:select:role:approver
 */
async function showRoleSelectForFeature(interaction, {
  customId,
  typeLabel = '役職',
  multiple = false,
  emptyMessage = '⚠️ まだ役職が設定パネルで登録されていません。',
  content = null,
} = {}) {
  const storeRoleConfig = await loadStoreRoleConfig(interaction.guildId);
  const roles = storeRoleConfig.roles || [];

  if (!roles.length) {
    return interaction.reply({
      content: emptyMessage,
      flags: MessageFlags.Ephemeral,
    });
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder(`${typeLabel}を選択してください`);

  if (multiple) {
    select.setMinValues(0).setMaxValues(Math.min(roles.length, 25));
  }

  select.addOptions(
    roles.slice(0, 25).map((r) => ({
      label: r.name || r,
      value: r.id || r,
    })),
  );

  const row = new ActionRowBuilder().addComponents(select);

  return interaction.reply({
    content: content ?? `👥 ${typeLabel}を選択してください：`,
    components: [row],
    flags: MessageFlags.Ephemeral,
  });
}

// ----------------------------------------------------
// 👥 役職選択後 → 機能config保存 & パネル権限反映
// ----------------------------------------------------
/**
 * 役職が選択されたあと、
 *   1. 機能ごとの config に (type → roleId) を保存
 *   2. その機能で「店舗ごとに設置されているパネル」のチャンネル権限を更新
 *
 *   ※ 実際の「どのチャンネルにどんな権限を付けるか」は applyPermissionCallback に渡す
 */
async function handleRoleSelectedForFeature(interaction, {
  loadFeatureConfig,        // async (guildId) => config
  saveFeatureConfig,        // async (guildId, config) => void
  labelMap = {},            // { approver: '承認役職', viewer: '閲覧役職', applicant: '申請役職' } など
  applyPermissionCallback,  // async ({ interaction, config, type, roleIds }) => void (任意)
} = {}) {
  const guildId = interaction.guildId;
  const type = interaction.customId.split(':')[4]; // keihi:config:select:role:<type>
  const roleIds = interaction.values;
  const label = labelMap[type] || '役職';

  const config = await loadFeatureConfig(guildId);
  const roleKey = `${type}RoleIds`; // approverRoleIds, viewerRoleIds など
  config[roleKey] = roleIds;
  await saveFeatureConfig(guildId, config);

  // パネル権限の反映（各機能ごとのロジックに委ねる）
  if (applyPermissionCallback) {
    await applyPermissionCallback({ interaction, config, type, roleIds });
  }

  await interaction.update({
    content: `✅ ${label}を更新しました。`,
    components: [],
  });
}

module.exports = {
  showStoreSelectForPanel,
  handleStoreSelectedForPanel,
  handleChannelSelectedForPanel,
  showRoleSelectForFeature,
  handleRoleSelectedForFeature,
};