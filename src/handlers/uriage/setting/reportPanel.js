// src/handlers/uriage/setting/reportPanel.js

const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');
const { loadStoreConfig } = require('../../../utils/config/storeConfigManager');
const { loadUriageConfig, saveUriageConfig } = require('../../../utils/uriage/uriageConfigManager');
const { updateUriagePanel } = require('./panel');
const { IDS } = require('../ids');
const { sendSettingLog } = require('../../../utils/uriage/embedLogger');

/**
 * 店舗別の「売上報告パネル」を設置するフロー
 * @param {import('discord.js').Interaction} interaction
 * @param {{step: 'select'}} [options] - オプション
 */
async function postUriageReportPanel(interaction, options) {
  const guildId = interaction.guild.id;

  // ----------------------------------------
  // ステップ1: 店舗選択メニューを表示
  // ----------------------------------------
  // ✅ ボタン応答タイムアウト回避
  await interaction.deferUpdate();

  const storeData = await loadStoreConfig(guildId);
  const stores = storeData?.stores || [];

      return interaction.followUp({
        content: '⚠️ 店舗情報が登録されていません。GCS/config/店舗_役職_ロール.json を確認してください。',
        ephemeral: true,
      });
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId(IDS.SEL_STORE)
      .setPlaceholder('パネルを設置する店舗を選択')
    .addOptions(stores.map((s) => ({ label: s.name, value: s.id })));

    return interaction.followUp({
      content: '🏪 どの店舗の売上報告パネルを設置しますか？',
      components: [new ActionRowBuilder().addComponents(menu)],
      ephemeral: true,
    });
}

async function handleReportPanelSelection(interaction) {
  // ----------------------------------------
  // ステップ2: 店舗選択後、チャンネル選択メニューを表示
  // ----------------------------------------
  if (interaction.customId === IDS.SEL_STORE) {
    const storeId = interaction.values[0];
    const channelMenu = new ChannelSelectMenuBuilder()
      .setCustomId(`${IDS.SEL_TEXT_CHANNEL}:${storeId}`)
      .setPlaceholder('設置先のテキストチャンネルを選択')
      .addChannelTypes(ChannelType.GuildText);

    return interaction.update({
      content: `✅ 店舗 **${storeId}** を選択しました。\n次に、パネルを設置するチャンネルを選択してください。`,
      components: [new ActionRowBuilder().addComponents(channelMenu)],
    });
  }

  // ----------------------------------------
  // ステップ3: チャンネル選択後、パネルを設置
  // ----------------------------------------
  if (interaction.customId.startsWith(IDS.SEL_TEXT_CHANNEL)) {
    const storeId = interaction.customId.split(':')[2];
    const channelId = interaction.values[0];
    const channel = await interaction.guild.channels.fetch(channelId);

    const panelEmbed = new EmbedBuilder()
      .setTitle(`💰 売上報告パネル (${storeId})`)
      .setDescription('下のボタンを押して、本日の売上を報告してください。')
      .setColor(0x5865f2);

    const reportButton = new ButtonBuilder()
      // include store id in the customId so handlers can identify the store
      .setCustomId(`${IDS.BTN_REPORT_OPEN}:${storeId}`) // uriage:report:open:storeId
      .setLabel('売上を報告する')
      .setStyle(ButtonStyle.Primary);

    const sent = await channel.send({
      embeds: [panelEmbed],
      components: [new ActionRowBuilder().addComponents(reportButton)],
    });

    // 設定を保存（messageId を含める）
    const config = await loadUriageConfig(guildId);
    config.panels[storeId] = {
      channelId: channelId,
      messageId: sent.id,
    };
    config.lastUpdated = new Date().toISOString();
    await saveUriageConfig(guildId, config);

    // ログ送信
    await sendSettingLog(interaction, {
      title: '売上報告パネル設置',
      fields: [{ name: '店舗', value: storeId }, { name: 'チャンネル', value: `<#${channelId}>` }],
    });

    // 設定パネルを更新して、設置一覧などが直ちに反映されるようにする
    await updateUriagePanel(interaction);

    return interaction.update({ content: `✅ **${storeId}** の売上報告パネルを <#${channelId}> に設置しました。`, components: [] });
  }
}

module.exports = {
  postUriageReportPanel,
  handleReportPanelSelection,
};
