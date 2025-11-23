// src/handlers/keihi/setting/keihiItemHandler.js
// ----------------------------------------------------
// 経費項目登録（設定側）
// ・ボタン keihi_item:<store>
// ・モーダル keihi_item_modal:<store>
// ----------------------------------------------------

const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require("discord.js");

const logger = require("../../../utils/logger");
const {
  loadKeihiConfig,
  saveKeihiConfig,
} = require("../../../utils/keihi/keihiConfigManager");
const { buildKeihiReportPayload } = require("../request/KeihiPanel_Request");
const { sendSettingLog } = require("../../../utils/config/configLogger");

/**
 * 経費項目登録モーダルを開く
 * @param {import('discord.js').ButtonInteraction} interaction
 * @param {string} store
 */
async function openItemModal(interaction, store) {
  try {
    const guildId = interaction.guild.id;
    const keihiConfig = await loadKeihiConfig(guildId);
    const itemsByStore = keihiConfig.itemsByStore || {};
    const currentItems = itemsByStore[store] || [];

    const modal = new ModalBuilder()
      .setCustomId(`keihi_item_modal:${store}`)
      .setTitle(`経費項目登録 - ${store}`);

    const input = new TextInputBuilder()
      .setCustomId("items")
      .setLabel("経費項目（1行1項目で入力）")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setPlaceholder("例：\n家賃\n水道光熱費\n広告宣伝費")
      .setValue(currentItems.join("\n"));

    modal.addComponents(
      new ActionRowBuilder().addComponents(input),
    );

    await interaction.showModal(modal);
  } catch (err) {
    logger.error("[keihiItemHandler] openItemModal エラー:", err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction
        .reply({
          content: "⚠️ 経費項目モーダルの表示中にエラーが発生しました。",
          ephemeral: true,
        })
        .catch(() => {});
    }
  }
}

/**
 * 経費項目モーダルの送信処理
 * @param {import('discord.js').ModalSubmitInteraction} interaction
 * @param {string} store
 */
async function submitItemModal(interaction, store) {
  const guild = interaction.guild;
  const guildId = guild.id;

  try {
    const raw = interaction.fields.getTextInputValue("items") || "";
    const lines = raw
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const newItems = Array.from(new Set(lines)); // 重複削除

    // 設定読み込み
    const keihiConfig = await loadKeihiConfig(guildId);
    keihiConfig.itemsByStore = keihiConfig.itemsByStore || {};

    const beforeItems = keihiConfig.itemsByStore[store] || [];
    keihiConfig.itemsByStore[store] = newItems;

    // 保存
    await saveKeihiConfig(guildId, keihiConfig);

    // 既存の経費申請パネルを再描画
    const panelMap = keihiConfig.panelMap || {};
    const panelMessageMap = keihiConfig.panelMessageMap || {};
    const panelChannelId = panelMap[store];
    const panelMessageId = panelMessageMap[store];

    if (panelChannelId && panelMessageId) {
      try {
        const panelChannel =
          guild.channels.cache.get(panelChannelId) ||
          (await guild.channels.fetch(panelChannelId).catch(() => null));

        if (panelChannel) {
          const panelMessage = await panelChannel.messages
            .fetch(panelMessageId)
            .catch(() => null);

          if (panelMessage) {
            // KeihiPanel_Request 側で共通の embed + ボタンを再構築
            const payload = await buildKeihiReportPayload(guild, store);
            await panelMessage.edit(payload);
          }
        }
      } catch (e) {
        logger.warn(
          "[keihiItemHandler] 経費申請パネル再描画に失敗しました:",
          e.message
        );
      }
    }

    // 設定ログ出力（★ interaction を渡すように修正）
    try {
      const panelUrl =
        panelChannelId && panelMessageId
          ? `https://discord.com/channels/${guildId}/${panelChannelId}/${panelMessageId}`
          : null;

      // ★★★ ここで guildId ではなく interaction を渡す ★★★
      await sendSettingLog(interaction, {
        type: "keihi_items",
        action: "経費項目登録",
        store,
        before: beforeItems,
        after: newItems,
        userId: interaction.user.id, // 念のためuserIdも渡す
        panelUrl,
      });
    } catch (e) {
      logger.warn("[keihiItemHandler] 設定ログ送信に失敗:", e.message);
    }

    // モーダルに対する返信
    await interaction.reply({
      content: `✅ 店舗 **${store}** の経費項目を更新しました。\n\n\`\`\`\n${
        newItems.join("\n") || "（項目なし）"
      }\n\`\`\``,
      ephemeral: true,
    });
  } catch (err) {
    logger.error("[keihiItemHandler] submitItemModal エラー:", err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction
        .reply({
          content: "⚠️ 経費項目の保存中にエラーが発生しました。",
          ephemeral: true,
        })
        .catch(() => {});
    }
  }
}

module.exports = {
  openItemModal,
  submitItemModal,
};