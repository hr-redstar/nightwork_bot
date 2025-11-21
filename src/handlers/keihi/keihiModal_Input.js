// src/handlers/keihi/keihiModal_Input.js
// ----------------------------------------------------
// 経費申請モーダル処理（申請 → 保存）
// ----------------------------------------------------

const { EmbedBuilder } = require("discord.js");
const {
  validateKeihiInput,
} = require("../../utils/keihi/keihiValidator");

const {
  saveDailyKeihi,
} = require("../../utils/keihi/keihiConfigManager");

const { getStoreList } = require("../../utils/config/configAccessor");
const { sendReportLog } = require("../../utils/keihi/embedLogger");

module.exports = {
  /**
   * @param {import("discord.js").ModalSubmitInteraction} interaction
   */
  async handleKeihiModalInput(interaction) {
    try {
      const guildId = interaction.guild.id;
      const client = interaction.client;

      // customId = "keihi_modal_input:<store>"
      const [_, storeName] = interaction.customId.split(":");

      // ===== 入力項目 =====
      const amountText = interaction.fields.getTextInputValue("amount");
      const description = interaction.fields.getTextInputValue("description");
      const imageUrl = interaction.fields.getTextInputValue("image");

      const storeList = await getStoreList(guildId);

      // ===== バリデーション =====
      const result = validateKeihiInput({
        amount: amountText,
        description,
        store: storeName,
        storeList,
        imageUrl,
      });

      if (!result.ok) {
        return interaction.reply({
          content: `❌ ${result.reason}`,
          ephemeral: true,
        });
      }

      // ===== 保存データ =====
      const entry = {
        userId: interaction.user.id,
        store: storeName,
        amount: result.amount,
        description: result.description,
        imageUrl: result.imageUrl,
      };

      // ===== データ保存 =====
      await saveDailyKeihi(guildId, storeName, entry);

      // ===== 報告ログ =====
      await sendReportLog(guildId, client, {
        store: storeName,
        userId: interaction.user.id,
        amount: result.amount,
        description: result.description,
        imageUrl: result.imageUrl,
      });

      // ===== 完了メッセージ =====
      const replyEmbed = new EmbedBuilder()
        .setTitle("💰 経費申請を受け付けました")
        .setColor(0x2ecc71)
        .addFields(
          { name: "店舗", value: storeName, inline: true },
          { name: "金額", value: `${result.amount} 円`, inline: true },
          { name: "内容", value: result.description, inline: false }
        )
        .setTimestamp();

      if (result.imageUrl) {
        replyEmbed.setImage(result.imageUrl);
      }

      return interaction.reply({
        embeds: [replyEmbed],
        ephemeral: true,
      });
    } catch (err) {
      console.error("[keihiModal_Input] エラー:", err);
      return interaction.reply({
        content: "⚠️ 経費申請処理中にエラーが発生しました。",
        ephemeral: true,
      });
    }
  },
};
