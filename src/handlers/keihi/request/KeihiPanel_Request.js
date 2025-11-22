// src/handlers/keihi/KeihiPanel_Request.js
// ----------------------------------------------------
// 経費申請パネルをチャンネルに設置する処理
// ----------------------------------------------------

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
} = require("discord.js");

const { getStoreList } = require("../../../utils/config/configAccessor");
const {
  getKeihiPanelList,
  saveKeihiPanelList,
} = require("../../../utils/keihi/keihiConfigManager");
const { sendSettingLog } = require("../../../utils/config/configLogger");

module.exports = {
  /**
   * 1) 「経費パネル設置」ボタン
   * 店舗リストを表示
   */
  async startKeihiPanelSetup(interaction) {
    const guildId = interaction.guild.id;
    const stores = await getStoreList(guildId);

    if (!stores.length) {
      return interaction.reply({
        content: "⚠️ 店舗が登録されていません。",
        ephemeral: true,
      });
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId("keihi_setup_select_store")
      .setPlaceholder("パネルを設置する店舗を選択")
      .addOptions(
        stores.map((s) => ({
          label: s,
          value: s,
        }))
      );

    const embed = new EmbedBuilder()
      .setTitle("📤 経費パネル設置")
      .setDescription("店舗を選択してください。")
      .setColor(0x3498db);

    return interaction.update({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(menu)],
    });
  },

  /**
   * 2) 店舗を選んだらチャンネル選択へ
   */
  async selectChannelForKeihiPanel(interaction, storeName) {
    const channelMenu = new ChannelSelectMenuBuilder()
      .setCustomId(`keihi_setup_select_channel:${storeName}`)
      .setPlaceholder("設置するチャンネルを選択（検索可）")
      .setChannelTypes([ChannelType.GuildText]);

    const embed = new EmbedBuilder()
      .setTitle(`📤 経費パネル設置 - ${storeName}`)
      .setDescription("パネルを設置するチャンネルを選択してください。")
      .setColor(0x3498db);

    return interaction.update({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(channelMenu)],
    });
  },

  /**
   * 3) チャンネルを選択したらパネル送信 → GCS保存 → 設定ログ
   */
  async postKeihiPanel(interaction, storeName, channelId) {
    const guildId = interaction.guild.id;
    const channel = interaction.guild.channels.cache.get(channelId);

    if (!channel) {
      return interaction.reply({
        content: "⚠️ チャンネルが見つかりません。",
        ephemeral: true,
      });
    }

    // === 経費申請パネル UI ===
    const embed = new EmbedBuilder()
      .setTitle(`💰 経費申請パネル - ${storeName}`)
      .setDescription("経費申請はこちらから行えます。")
      .setColor(0x2ecc71);

    const button = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`keihi_request:${storeName}`)
        .setLabel("経費を申請する")
        .setStyle(ButtonStyle.Primary)
    );

    // パネル送信
    const panelMessage = await channel.send({
      embeds: [embed],
      components: [button],
    });

    // === GCS：パネル設置一覧保存 ===
    const panelList = await getKeihiPanelList(guildId);
    panelList[storeName] = channelId;
    await saveKeihiPanelList(guildId, panelList);

    // === 設定ログへ出力 ===
    await sendSettingLog(guildId, {
      action: "経費パネル設置",
      store: storeName,
      channel: channelId,
      user: interaction.user.id,
    });

    // 管理者に返信（エフェメラルでOK）
    return interaction.update({
      content: `✅ 経費パネルを <#${channelId}> に設置しました。`,
      embeds: [],
      components: [],
    });
  },
};
