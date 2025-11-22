// src/handlers/keihi/keihiPanelHandler.js
// ------------------------------------------------------------
// 経費設定パネル → 経費申請パネル設置（店舗 → チャンネル → 設置）
// ------------------------------------------------------------

const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
  EmbedBuilder
} = require("discord.js");

const { getStoreList } = require("../../../utils/config/configAccessor");
const {
  loadKeihiConfig,
  saveKeihiConfig,
} = require("../../../utils/keihi/keihiConfigManager");

const { postKeihiReportPanel } = require("../request/KeihiPanel_Request");
const { sendSettingLog } = require("../../../utils/config/configLogger");
const logger = require("../../../utils/logger");

module.exports = {
  // ------------------------------------------------------------------
  // STEP 1：店舗選択
  // ------------------------------------------------------------------
  async openStoreSelect(interaction) {
    const guildId = interaction.guild.id;
    const stores = await getStoreList(guildId);

    if (!stores.length) {
      return interaction.reply({
        content: "⚠️ 店舗が設定されていません。",
        ephemeral: true,
      });
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId("keihi_panel_store")
      .setPlaceholder("経費パネルを設置する店舗を選んでください")
      .addOptions(stores.map((s) => ({ label: s, value: s })));

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle("📍 経費パネル設置")
      .setDescription("経費申請パネルを設置する店舗を選択してください。");

    return interaction.reply({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(menu)],
      ephemeral: true,
    });
  },

  // ------------------------------------------------------------------
  // STEP 2：チャンネル選択
  // ------------------------------------------------------------------
  async openChannelSelect(interaction, store) {
    const menu = new ChannelSelectMenuBuilder()
      .setCustomId(`keihi_panel_channel:${store}`)
      .setPlaceholder("パネルを設置するテキストチャンネルを選択")
      .addChannelTypes(ChannelType.GuildText);

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle(`🏪 店舗：${store}`)
      .setDescription("経費申請パネルの設置先チャンネルを選択してください。");

    return interaction.update({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(menu)],
    });
  },

  // ------------------------------------------------------------------
  // STEP 3：パネル設置
  // ------------------------------------------------------------------
  async placePanel(interaction, store) {
    const guild = interaction.guild;
    const guildId = guild.id;

    // 選択されたチャンネル
    const channel = interaction.channels.first();
    if (!channel) {
      return interaction.reply({
        content: "⚠️ チャンネルを取得できませんでした。",
        ephemeral: true,
      });
    }

    const keihiConfig = await loadKeihiConfig(guildId);
    keihiConfig.panelMap = keihiConfig.panelMap || {};

    // 既存パネルがあれば削除
    if (keihiConfig.panelMap[store]) {
      const oldChId = keihiConfig.panelMap[store];
      try {
        const oldChannel = guild.channels.cache.get(oldChId);
        if (oldChannel) {
          const msgs = await oldChannel.messages.fetch({ limit: 50 });
          const panelMsg = msgs.find((m) => m.author.id === interaction.client.user.id);
          if (panelMsg) await panelMsg.delete();
        }
      } catch (e) {
        logger.warn("[KeihiPanel] 既存パネル削除失敗:", e.message);
      }
    }

    // 新しい経費申請パネルを送信
    const panelMessage = await postKeihiReportPanel(channel, { store });

    // 保存
    keihiConfig.panelMap[store] = channel.id;
    await saveKeihiConfig(guildId, keihiConfig);

    // 設定ログ
    await sendSettingLog(guildId, {
      type: "keihi_panel_setup",
      action: "経費申請パネルを設置",
      store,
      userId: interaction.user.id,
      channelId: channel.id,
      messageId: panelMessage.id,
    });

    return interaction.update({
      content: `✅ **${store}** の経費申請パネルを <#${channel.id}> に設置しました。`,
      components: [],
      embeds: [],
    });
  },
};
