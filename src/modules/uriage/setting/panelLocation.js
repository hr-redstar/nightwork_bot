// src/handlers/uriage/setting/panelLocation.js
// 売上報告パネルの設置フロー

const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
} = require('discord.js');
const { MessageFlags } = require('discord.js');
const { loadStoreRoleConfig } = require('../../../utils/config/storeRoleConfigManager');
const { buildStoreSelectOptions } = require('../../../utils/config/storeSelectHelper');
const {
  loadUriageConfig,
  saveUriageConfig,
  loadUriageStoreConfig,
  saveUriageStoreConfig,
} = require('../../../utils/uriage/uriageConfigManager');
const { sendSettingLog } = require('../../../utils/config/configLogger');
const { sendUriagePanel, refreshUriageSettingPanelMessage, resolveStoreName } = require('./panel');
const { IDS } = require('./ids');

// 店舗選択
async function handleSetPanelButton(interaction) {
  const guildId = interaction.guild.id;
  const options = await buildStoreSelectOptions(guildId);

  if (!options.length) {
    await interaction.reply({
      content: '店舗設定が見つかりません。先に 店舗_役職_ロール.json を設定してください。',
    });
    return;
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId(IDS.SEL_STORE_FOR_PANEL)
    .setPlaceholder('売上報告パネルを設置する店舗を選択')
    .addOptions(options);

  const row = new ActionRowBuilder().addComponents(select);
  await interaction.reply({
    content: '売上報告パネルを設置する店舗を選んでください。',
    components: [row],
    flags: MessageFlags.Ephemeral,
  });
}

// 店舗選択 → チャンネル選択
async function handleStoreForPanelSelect(interaction) {
  const storeId = interaction.values[0];

  const chSelect = new ChannelSelectMenuBuilder()
    .setCustomId(`${IDS.PANEL_CHANNEL_PREFIX}${storeId}`)
    .setPlaceholder('売上報告パネルを置くテキストチャンネルを選択')
    .setChannelTypes(ChannelType.GuildText);

  const row = new ActionRowBuilder().addComponents(chSelect);

  await interaction.update({
    content: `店舗「${storeId}」の売上報告パネルを置くチャンネルを選択してください。`,
    components: [row],
    flags: MessageFlags.Ephemeral,
  });
}

// チャンネル確定 → パネル送信＆保存
async function handlePanelChannelSelect(
  interaction,
  refreshPanel = refreshUriageSettingPanelMessage,
) {
  const guild = interaction.guild;
  const guildId = guild.id;
  const parts = interaction.customId.split(':');
  const storeId = parts[parts.length - 1];

  const channelId = interaction.values[0];
  const channel = guild.channels.cache.get(channelId);
  if (!channel || !channel.isTextBased()) {
    await interaction.reply({ content: 'テキストチャンネルを選択してください。' });
    return;
  }

  await interaction.deferUpdate();

  const uriageConfig = await loadUriageConfig(guildId);
  if (!uriageConfig.panels) uriageConfig.panels = {};
  uriageConfig.panels[storeId] = { channelId, messageId: null };
  await saveUriageConfig(guildId, uriageConfig);

  // パネル送信
  const panelMessage = await sendUriagePanel(channel, storeId);

  // 店舗ごとの config 保存
  const storeConfig = await loadUriageStoreConfig(guildId, storeId);
  storeConfig.channelId = panelMessage.channelId;
  storeConfig.messageId = panelMessage.id;
  await saveUriageStoreConfig(guildId, storeId, storeConfig);

  // 設定パネルを再描画
  const latestConfig = await loadUriageConfig(guildId);
  await refreshPanel(guild, latestConfig);

  // 設定ログ
  const storeRoleConfig = await loadStoreRoleConfig(guildId).catch(() => null);
  const storeName = resolveStoreName(storeRoleConfig, storeId);
  await sendSettingLog(interaction, {
    title: '売上報告パネル設置',
    description: `店舗「${storeName}」の売上報告パネルを <#${channelId}> に設置しました。`,
  }).catch(() => {});

  await interaction.editReply({
    content: `店舗「${storeName}」の売上報告パネルを <#${channelId}> に設置しました。`,
    components: [],
    flags: MessageFlags.Ephemeral,
  });
}

module.exports = {
  handleSetPanelButton,
  handleStoreForPanelSelect,
  handlePanelChannelSelect,
};
