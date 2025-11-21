// src/handlers/keihi/keihiViewHandler.js
// ----------------------------------------------------
// 経費閲覧（日付別）
// ----------------------------------------------------

const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
} = require("discord.js");

const { dailyPath } = require("../../utils/keihi/keihiConfigManager");
const { readJSON } = require("../../utils/gcs");
const { loadKeihiConfig } = require("../../utils/keihi/keihiConfigManager");
const { getStoreList } = require("../../utils/config/configAccessor");

module.exports = {
  /**
   * 経費閲覧 - 店舗選択
   */
  async showKeihiViewStoreSelector(interaction) {
    const guildId = interaction.guild.id;
    const storeList = await getStoreList(guildId);

    if (!storeList.length) {
      return interaction.reply({
        content: "⚠️ 登録されている店舗がありません。",
        ephemeral: true,
      });
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId("keihi_view_store_select")
      .setPlaceholder("閲覧する店舗を選択")
      .addOptions(storeList.map((s) => ({ label: s, value: s })));

    const embed = new EmbedBuilder()
      .setTitle("📅 経費閲覧 - 店舗選択")
      .setDescription("経費一覧を閲覧する店舗を選択してください。")
      .setColor(0x3498db);

    return interaction.reply({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(menu)],
      ephemeral: true,
    });
  },

  /**
   * 経費閲覧 - 日付入力モーダル
   */
  async showKeihiViewDateModal(interaction, storeName) {
    const modal = new ModalBuilder()
      .setCustomId(`keihi_view_modal:${storeName}`)
      .setTitle(`経費閲覧 - ${storeName}`);

    const dateInput = new TextInputBuilder()
      .setCustomId("view_date")
      .setLabel("日付 (YYYY-MM-DD)")
      .setPlaceholder("例: 2025-11-19")
      .setRequired(true)
      .setStyle(TextInputStyle.Short);

    modal.addComponents(new ActionRowBuilder().addComponents(dateInput));

    return interaction.showModal(modal);
  },

  /**
   * 経費閲覧 - 結果表示
   */
  async handleKeihiViewModal(interaction) {
    const guildId = interaction.guild.id;
    const member = await interaction.guild.members.fetch(interaction.user.id);

    // customId = keihi_view_modal:<store>
    const [_, storeName] = interaction.customId.split(":");

    // === 閲覧権限チェック ===
    const keihiConfig = await loadKeihiConfig(guildId);
    const viewRoles = keihiConfig.viewRoles || [];

    const hasPermission = viewRoles.some((r) => member.roles.cache.has(r));

    if (!hasPermission) {
      return interaction.reply({
        content: "🚫 あなたには閲覧権限がありません。",
        ephemeral: true,
      });
    }

    // === 日付取得 ===
    const inputDate = interaction.fields.getTextInputValue("view_date");
    const [y, m, d] = (inputDate || "").split("-");

    if (!y || !m || !d) {
      return interaction.reply({
        content: "⚠️ 日付の形式が不正です。YYYY-MM-DD で入力してください。",
        ephemeral: true,
      });
    }

    const filePath = dailyPath(guildId, storeName, y, m, d);

    const list = (await readJSON(filePath)) || [];

    if (!list.length) {
      return interaction.reply({
        content: `📭 **${storeName}** の **${inputDate}** の経費はありませんでした。`,
        ephemeral: true,
      });
    }

    // === 一覧Embed生成 ===
    const embed = new EmbedBuilder()
      .setTitle(`📅 経費一覧 - ${storeName} (${inputDate})`)
      .setColor(0x2ecc71)
      .setTimestamp();

    for (const entry of list) {
      embed.addFields({
        name: `💰 ${entry.amount} 円`,
        value:
          `申請者: <@${entry.userId}>\n` +
          `内容: ${entry.description}\n` +
          `承認: ${ entry.approved ? "🟢 承認済" : "🔴 未承認"}\n`,
      });
    }

    return interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  },
};
