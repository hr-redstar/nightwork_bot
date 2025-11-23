// src/handlers/keihi/setting/keihiPanelHandler.js
// ------------------------------------------------------------
// 経費設定パネル → 経費申請パネル設置（店舗 → チャンネル → 設置）
// ------------------------------------------------------------

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
} = require("discord.js");

const logger = require("../../../utils/logger");
const { getStoreList } = require("../../../utils/config/configAccessor");
const {
  loadKeihiConfig,
  saveKeihiConfig,
} = require("../../../utils/keihi/keihiConfigManager");
const { postKeihiReportPanel } = require("../request/KeihiPanel_Request");
const { sendSettingLog } = require("../../../utils/config/configLogger");
const { EmbedBuilder } = require("discord.js");

/**
 * 経費設定パネルを送信・更新する
 * @param {import('discord.js').Interaction} interaction
 */
async function postKeihiSettingPanel(interaction) {
  const guild = interaction.guild;
  const keihiConfig = await loadKeihiConfig(guild.id);

  const embed = new EmbedBuilder()
    .setTitle("経費設定パネル")
    .setDescription("経費機能に関する設定を行います。")
    .setColor("#81b29a");

  // 承認役職
  const approvalRoles = keihiConfig.approvalRoles || [];
  const approvalMentions = approvalRoles.length
    ? approvalRoles.map((id) => `<@&${id}>`).join(" ")
    : "未設定";
  embed.addFields({ name: "🛡️ 承認役職", value: approvalMentions });

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("keihi_panel_setup")
      .setLabel("経費パネル設置")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("🔧"),
    new ButtonBuilder()
      .setCustomId("keihi_role_approval")
      .setLabel("承認役職")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("🛡️")
  );

  // interactionがメッセージコンポーネントからのものであれば、元のメッセージを編集
  if (interaction.isMessageComponent()) {
    await interaction.message.edit({ embeds: [embed], components: [buttons] });
  } else {
    await interaction.reply({ embeds: [embed], components: [buttons] });
  }
}

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
      .setPlaceholder("経費申請パネルを設置する店舗を選んでください")
      .addOptions(stores.map((s) => ({ label: s, value: s })));

    const row = new ActionRowBuilder().addComponents(menu);

    return interaction.reply({
      content: "📍 経費パネル設置\n経費申請パネルを設置する店舗を選択してください。",
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
      content: ` 経費パネル設置\n店舗：**${store}**\n\n経費申請パネルを設置するチャンネルを選択してください。`,
      components: [row],
    });
  },

  // ------------------------------------------------------------------
  // STEP 3：パネル設置
  // ------------------------------------------------------------------
  async placePanel(interaction, store) {
    const guild = interaction.guild;
    const guildId = guild.id;

    // ChannelSelectMenuInteraction から選択チャンネル取得
    const channel = interaction.channels.first();
    if (!channel) {
      return interaction.update({
        content: "⚠️ チャンネルが取得できませんでした。",
        components: [],
      });
    }

    const keihiConfig = await loadKeihiConfig(guildId);

    // 既存パネルがあれば削除
    const panelMap = keihiConfig.panelMap || {};
    const panelMessageMap = keihiConfig.panelMessageMap || {};

    const oldChannelId = panelMap[store];
    const oldMessageId = panelMessageMap[store];

    if (oldChannelId && oldMessageId) {
      try {
        const oldChannel =
          guild.channels.cache.get(oldChannelId) ||
          (await guild.channels.fetch(oldChannelId).catch(() => null));
        if (oldChannel) {
          const oldMessage = await oldChannel.messages
            .fetch(oldMessageId)
            .catch(() => null);
          if (oldMessage) await oldMessage.delete();
        }
      } catch (e) {
        logger.warn("[KeihiPanelHandler] 既存パネル削除失敗:", e.message);
      }
    }

    // 経費申請パネルを送信
    const panelMessage = await postKeihiReportPanel(channel, { store });

    // 設置情報を保存
    keihiConfig.panelMap = keihiConfig.panelMap || {};
    keihiConfig.panelMessageMap = keihiConfig.panelMessageMap || {};
    keihiConfig.panelMap[store] = channel.id;
    keihiConfig.panelMessageMap[store] = panelMessage.id;

    await saveKeihiConfig(guildId, keihiConfig);

    // 設定ログ出力（interaction を渡す）
    try {
      await sendSettingLog(interaction, {
        type: "keihi_panel",
        action: "経費申請パネルを設置",
        store,
        channelId: channel.id,
        messageId: panelMessage.id,
      });
    } catch (e) {
      logger.warn("[KeihiPanelHandler] 設定ログ送信に失敗:", e.message);
    }

    // ChannelSelectMenuInteraction の応答
    return interaction.update({
      content: `✅ 店舗 **${store}** の経費申請パネルを <#${channel.id}> に設置しました。`,
      components: [],
    });
  },
  postKeihiSettingPanel,
};
