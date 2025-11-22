// src/handlers/keihi/keihiPanel_Setting.js
// ------------------------------------------------------------
// /設定経費 → 経費設定パネルの表示（既存は更新、なければ新規）
// ------------------------------------------------------------

const { loadKeihiConfig, saveKeihiConfig } = require("../../../utils/keihi/keihiConfigManager");
const { getStoreList } = require("../../../utils/config/configAccessor");
const { sendSettingLog } = require("../../../utils/config/configLogger");

const { embedKeihiSetting } = require("../components/keihiEmbeds");
const { settingButtons } = require("../components/keihiButtons");

const logger = require("../../../utils/logger");

module.exports = {
  /**
   * /設定経費
   * - 経費設定パネルをチャンネルに送信（既存があれば更新）
   */
  async postKeihiSettingPanel(interaction) {
    const guildId = interaction.guild.id;
    const channel = interaction.channel;

    await interaction.deferReply({ ephemeral: true });

    try {
      // ---------------------------------------
      // 1. 設定読み込み
      // ---------------------------------------
      const stores = await getStoreList(guildId);
      const keihiConfig = await loadKeihiConfig(guildId);

      // keihiConfig.panelMap: { store: channelId }
      const panelMap = keihiConfig.panelMap || {};

      // ---------------------------------------
      // 2. Embed & Components
      // ---------------------------------------
      const embed = embedKeihiSetting(
        buildPanelListField(interaction.guild, panelMap),
        buildRoleFields(interaction.guild, keihiConfig),
        "" // CSV説明（固定文でOK）
      );

      const components = settingButtons();

      // ---------------------------------------
      // 3. 既存パネルがあるか？
      // ---------------------------------------
      let settingPanel = keihiConfig.settingPanel || null;
      let panelMessage = null;

      if (settingPanel?.channelId && settingPanel?.messageId) {
        try {
          const oldChannel = interaction.guild.channels.cache.get(settingPanel.channelId);
          if (oldChannel) {
            panelMessage = await oldChannel.messages.fetch(settingPanel.messageId);
          }
        } catch (err) {
          logger.warn("[設定経費] 既存パネル取得失敗 → 新規作成します");
          panelMessage = null;
        }
      }

      // ---------------------------------------
      // 4. パネルを更新 or 新規作成
      // ---------------------------------------
      if (panelMessage) {
        // 更新
        await panelMessage.edit({ embeds: [embed], components });
      } else {
        // 新規作成
        const msg = await channel.send({ embeds: [embed], components });

        keihiConfig.settingPanel = {
          channelId: channel.id,
          messageId: msg.id,
        };

        await saveKeihiConfig(guildId, keihiConfig);

        // 設定ログに出力
        await sendSettingLog(guildId, {
          type: "keihi_setting_panel",
          action: "経費設定パネル設置",
          channelId: channel.id,
          messageId: msg.id,
          userId: interaction.user.id,
        });
      }

      // ---------------------------------------
      // 完了通知
      // ---------------------------------------
      return interaction.editReply("✅ 経費設定パネルを更新しました。");

    } catch (err) {
      logger.error("[設定経費] エラー:", err);
      return interaction.editReply("⚠️ 経費設定パネルの生成に失敗しました。");
    }
  }
};

// ========================================================
// 🔧 ヘルパー（表示整形）
// ========================================================

/** 経費パネル設置一覧フィールド用 */
function buildPanelListField(guild, panelMap) {
  const lines = Object.entries(panelMap).map(([store, chId]) => {
    const ch = guild.channels.cache.get(chId);
    return `・**${store}**：${ch ? `<#${ch.id}>` : "`削除済みチャンネル`"}`;
  });

  return {
    name: "📋 経費パネル設置一覧",
    value: lines.length ? lines.join("\n") : "未設置",
  };
}

/** 役職フィールド */
function buildRoleFields(guild, config) {
  const fmt = (roleIds) => {
    if (!roleIds?.length) return "未設定";
    return roleIds
      .map((id) => (guild.roles.cache.get(id) ? `<@&${id}>` : "`削除済みロール`"))
      .join("　");
  };

  return [
    {
      name: "🛡️ 承認役職",
      value: fmt(config.approvalRoles),
    }
  ];
}
