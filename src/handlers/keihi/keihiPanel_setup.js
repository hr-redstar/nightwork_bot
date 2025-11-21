// src/handlers/keihi/keihiPanel_setup.js
// ------------------------------------------------------------
// 経費設定パネル → 経費パネル設置（店舗 → チャンネル → 設置）
// ------------------------------------------------------------

const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
} = require("discord.js");

const { getStoreList } = require("../../utils/config/configAccessor");
const {
  loadKeihiConfig,
  saveKeihiConfig,
} = require("../../utils/keihi/keihiConfigManager");

const { postKeihiReportPanel } = require("./keihiPanel_Report");
const { sendSettingLog } = require("../../utils/config/configLogger");
const logger = require("../../utils/logger");

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

    const row = new ActionRowBuilder().addComponents(menu);

    return interaction.reply({
      content: "🏪 経費パネルを設置する店舗を選択してください。",
      components: [row],
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

    const row = new ActionRowBuilder().addComponents(menu);

    return interaction.update({
      content: `🏪 店舗：**${store}**\n📌 経費パネル設置先チャンネルを選択してください。`,
      components: [row],
    });
  },

  // ------------------------------------------------------------------
  // STEP 3：パネル設置
  // ------------------------------------------------------------------
  async placePanel(interaction, store) {
    const guildId = interaction.guild.id;
    const channel = interaction.channels.first();

    if (!channel) {
      return interaction.reply({
        content: "⚠️ チャンネルが取得できませんでした。",
        ephemeral: true,
      });
    }

    const keihiConfig = await loadKeihiConfig(guildId);

    // 既存パネルの削除確認
    if (keihiConfig.panelMap?.[store]) {
      const oldChId = keihiConfig.panelMap[store];
      try {
        const oldChannel = interaction.guild.channels.cache.get(oldChId);
        if (oldChannel) {
          const messages = await oldChannel.messages.fetch({ limit: 50 });
          const oldPanel = messages.find((m) => m.author.id === interaction.client.user.id);
          if (oldPanel) await oldPanel.delete();
        }
      } catch (e) {
        logger.warn("[KeihiPanel] 既存パネル削除失敗:", e.message);
      }
    }

    // 経費申請パネルを送信
    const panelMessage = await postKeihiReportPanel(channel, { store });

    // 設置情報を保存
    keihiConfig.panelMap = keihiConfig.panelMap || {};
    keihiConfig.panelMap[store] = channel.id;

    await saveKeihiConfig(guildId, keihiConfig);

    // 設定ログ出力
    await sendSettingLog(guildId, {
      type: "keihi_panel",
      action: `経費申請パネルを設置`,
      userId: interaction.user.id,
      channelId: channel.id,
      messageId: panelMessage.id,
      after: { store, channelId: channel.id },
    });

    return interaction.update({
      content: `✅ **${store}** の経費申請パネルを <#${channel.id}> に設置しました。`,
      components: [],
    });
  },
};
