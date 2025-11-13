// src/handlers/keihi/keihiPanel_Report.js

const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');
const {
  getKeihiPanelList,
  saveKeihiPanelList,
} = require('../../utils/keihi/gcsKeihiManager');
const { loadStoreRoleConfig } = require('../../utils/config/storeRoleConfigManager');
const { IDS } = require('./ids');
const { sendSettingLog } = require('../../utils/keihi/embedLogger');

/**
 * 店舗別の「経費報告パネル」を設置するフロー
 * @param {import('discord.js').Interaction} interaction
 * @param {{step: 'select'}} [options] - オプション
 */
async function postKeihiReportPanel(interaction, options) {
  const guildId = interaction.guild.id;

  // ----------------------------------------
  // ステップ1: 店舗選択メニューを表示
  // ----------------------------------------
  if (!options?.step) {
    const storeData = await loadStoreRoleConfig(guildId);
    const stores = storeData?.stores || [];

    if (!stores.length) {
      return interaction.followUp({
        content: '⚠️ 店舗情報が登録されていません。/設定 コマンドから店舗を登録してください。',
        ephemeral: true,
      });
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId('keihi:select:store')
      .setPlaceholder('パネルを設置する店舗を選択')
      .addOptions(stores.map((s) => ({ label: s.name || s, value: s.id || s })));

    return interaction.followUp({
      content: '🏪 どの店舗の経費報告パネルを設置しますか？',
      components: [new ActionRowBuilder().addComponents(menu)],
      ephemeral: true,
    });
  }

  // ----------------------------------------
  // ステップ2: 店舗選択後、チャンネル選択メニューを表示
  // ----------------------------------------
  const rawId = interaction.customId || '';
  if (rawId === 'keihi:select:store' || rawId === 'keihi_select_store') {
    const storeId = interaction.values[0];
    const channelMenu = new ChannelSelectMenuBuilder()
      .setCustomId(`keihi:select:textchannel:${storeId}`)
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
  if (rawId.startsWith('keihi:select:textchannel:') || rawId.startsWith('keihi_select_textchannel_')) {
    const parts = rawId.includes(':') ? rawId.split(':') : rawId.split('_');
    const storeId = parts[3];
    const channelId = interaction.values[0];
    const channel = await interaction.guild.channels.fetch(channelId);

    const panelEmbed = new EmbedBuilder()
      .setTitle(`💼 経費報告パネル (${storeId})`)
      .setDescription('下のボタンを押して、経費を申請してください。')
      .setColor(0x0078ff);

    const reportButton = new ButtonBuilder()
      .setCustomId('keihi:report:open') // 新しいID体系に合わせる
      .setLabel('経費を申請する')
      .setStyle(ButtonStyle.Primary);

    await channel.send({ embeds: [panelEmbed], components: [new ActionRowBuilder().addComponents(reportButton)] });

    // 設定を保存
    const panelList = await getKeihiPanelList(guildId);
    const existingIndex = panelList.findIndex(p => p.store === storeId);
    if (existingIndex > -1) panelList[existingIndex].channel = channelId;
    else panelList.push({ store: storeId, channel: channelId });
    await saveKeihiPanelList(guildId, { list: panelList });

    // ログ送信
    await sendSettingLog(guildId, { title: '経費報告パネル設置', fields: [{ name: '店舗', value: storeId }, { name: 'チャンネル', value: `<#${channelId}>` }] });

    return interaction.update({ content: `✅ **${storeId}** の経費報告パネルを <#${channelId}> に設置しました。`, components: [] });
  }
}

module.exports = { postKeihiReportPanel };