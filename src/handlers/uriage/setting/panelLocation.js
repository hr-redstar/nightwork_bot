// src/handlers/uriage/setting/panelLocation.js
// 「売上報告パネル設置」ボタンのフロー

const { ActionRowBuilder, StringSelectMenuBuilder, ChannelSelectMenuBuilder, ChannelType, MessageFlags } = require('discord.js');
const { loadStoreRoleConfig } = require('../../../utils/config/storeRoleConfigManager');
const { loadUriageConfig, saveUriageConfig } = require('../../../utils/uriage/uriageConfigManager');
const { postUriageReportPanel } = require('./uriagePanel_report');
const { refreshUriageSettingPanelMessage } = require('./panel'); // keihi の refreshKeihiSettingPanelMessage に相当
const { sendSettingLog } = require('../../../utils/uriage/embedLogger');
const logger = require('../../../utils/logger');
const { IDS } = require('./ids');

async function openPanelLocationSelector(interaction) {
  const guildId = interaction.guild.id;
  const storeData = await loadStoreRoleConfig(guildId);
  const stores = storeData?.stores || [];

  if (!stores.length) {
    return interaction.followUp({
      content: '⚠️ 店舗情報が登録されていません。',
      ephemeral: true,
    });
  }

  const menu = new StringSelectMenuBuilder()
    .setCustomId(IDS.SEL_STORE_FOR_PANEL)
    .setPlaceholder('パネルを設置する店舗を選択')
    .addOptions(stores.map((s) => ({ label: s.name, value: s.id })));

  return interaction.reply({
    content: '🏪 どの店舗の売上報告パネルを設置しますか？',
    components: [new ActionRowBuilder().addComponents(menu)],
    ephemeral: true,
  });
}

async function handleStoreForPanelSelect(interaction) {
  const storeId = interaction.values[0];
  const channelMenu = new ChannelSelectMenuBuilder() // customId に storeId を含める
    .setCustomId(`${IDS.SEL_PANEL_CHANNEL}:${storeId}`)
    .setPlaceholder('設置先のテキストチャンネルを選択')
    .addChannelTypes(ChannelType.GuildText);

  return interaction.update({
    content: `✅ 店舗 **${storeId}** を選択しました。\n次に、パネルを設置するチャンネルを選択してください。`,
    components: [new ActionRowBuilder().addComponents(channelMenu)],
  });
}

async function handlePanelChannelSelect(interaction) {
  await interaction.deferUpdate();
  const guildId = interaction.guild.id;
  const guild = interaction.guild;

  const id = interaction.customId; // uriage:setting:select:panel_channel:{店舗名}
  const parts = id.split(':');
  const storeId = parts[parts.length - 1]; // 店舗ID=店舗名として扱う

  const channelId = interaction.values[0];
  const channel = guild.channels.cache.get(channelId);

  if (!channel || !channel.isTextBased()) {
    await interaction.followUp({
      content: '選択されたチャンネルにメッセージを送信できません。',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const globalConfig = await loadUriageConfig(guildId);

  if (!globalConfig.panels) {
    globalConfig.panels = {};
  }

  if (!globalConfig.panels[storeId]) {
    globalConfig.panels[storeId] = {
      channelId,
      messageId: null,
    };
  } else {
    globalConfig.panels[storeId].channelId = channelId;
  }

  await saveUriageConfig(guildId, globalConfig);

  // 店舗ごとの売上報告パネルメッセージを upsert
  const panelMessage = await postUriageReportPanel({
    guild,
    channel,
    storeKey: storeId,
  });

  // panelMessage.id を globalConfig.panels に反映
  if (panelMessage?.id) {
    globalConfig.panels[storeId].messageId = panelMessage.id;
    await saveUriageConfig(guildId, globalConfig);
  }

  // 売上設定パネルを再描画
  await refreshUriageSettingPanelMessage(guild, globalConfig);

  await sendSettingLog(interaction, {
    title: '売上報告パネル設置',
    fields: [
      { name: '店舗', value: storeId, inline: true },
      { name: 'チャンネル', value: `<#${channelId}>`, inline: true },
    ],
  });

  await interaction.editReply({
    content: `✅ **${storeId}** の売上報告パネルを <#${channelId}> に設置しました。`,
    components: [],
  });
}

module.exports = {
  openPanelLocationSelector,
  handleStoreForPanelSelect,
  handlePanelChannelSelect,
};