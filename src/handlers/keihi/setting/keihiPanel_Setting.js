// src/handlers/keihi/setting/keihiPanel_Setting.js
// ----------------------------------------------------
// 経費設定パネル（/設定経費 で使う）
// ----------------------------------------------------

const logger = require("../../../utils/logger");
const { MessageFlags } = require("discord.js");
const {
  loadKeihiConfig,
  saveKeihiConfig,
} = require("../../../utils/keihi/keihiConfigManager");
const { embedKeihiSettingPanel } = require("../components/keihiEmbeds");
const { settingButtons } = require("../components/keihiButtons");
const { sendSettingLog } = require("../../config/configLogger");

module.exports = {
  /**
   * /設定経費 から呼び出し
   * 経費設定パネルを「チャンネルに送信 or 既存メッセージを更新」する
   */
  async postKeihiSettingPanel(interaction) {
    const guild = interaction.guild;
    const guildId = interaction.guild.id;
    const channel = interaction.channel;

    try {
      // まだ応答されていなければ、エフェメラルで応答を保留
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
      }

      // 設定読込
      const keihiConfig = await loadKeihiConfig(guildId);

      // パネル一覧（store -> channelId）想定
      const panelMap = keihiConfig.panelMap || {};
      const approvalRoles = keihiConfig.approvalRoles || [];

      const embed = embedKeihiSettingPanel(guild, panelMap, approvalRoles);
      const components = settingButtons();

      // 既存設定パネルがあれば更新
      let panelMessage = null;
      const settingPanel = keihiConfig.settingPanel || null;

      if (settingPanel?.channelId && settingPanel?.messageId) {
        try {
          const oldChannel = guild.channels.cache.get(settingPanel.channelId);
          if (oldChannel) {
            panelMessage = await oldChannel.messages.fetch(
              settingPanel.messageId
            );
          }
        } catch (e) {
          logger.warn(
            "[KeihiSettingPanel] 既存パネル取得失敗 → 新規作成します:",
            e.message
          );
          panelMessage = null;
        }
      }

      if (panelMessage) {
        // 既存パネルを更新
        await panelMessage.edit({
          embeds: [embed],
          components,
        });
      } else {
        // 新規送信
        const sent = await channel.send({
          embeds: [embed],
          components,
        });

        keihiConfig.settingPanel = {
          channelId: channel.id,
          messageId: sent.id,
        };
        await saveKeihiConfig(guildId, keihiConfig);

        // 設定ログに「設定パネル設置」として残す
        try {
          await sendSettingLog(interaction, {
            type: 'keihi_setting_panel',
            action: '経費設定パネル設置',
            channelId: channel.id,
            messageId: sent.id,
            userId: interaction.user.id,
          });
        } catch (e) {
          logger.warn('[keihiSettingPanel] 設定ログ送信に失敗:', e.message);
        }
      }

      // editReplyは一度しか使えないため、既に返信済みの場合は何もしない
      if (!interaction.replied) {
        await interaction.editReply("✅ 経費設定パネルを更新しました。");
      }
    } catch (err) {
      logger.error("[KeihiSettingPanel] エラー:", err);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "⚠️ 経費設定パネルの表示中にエラーが発生しました。",
          flags: [MessageFlags.Ephemeral],
        });
      } else {
        await interaction.editReply(
          "⚠️ 経費設定パネルの表示中にエラーが発生しました。"
        );
      }
    }
  },
};
