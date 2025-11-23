// src/handlers/keihi/keihiRoleHandler.js
//-----------------------------------------------------
// 経費設定パネル：承認役職 / 閲覧役職 / 申請役職の設定
//-----------------------------------------------------

const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");

const logger = require("../../../utils/logger");
const {
  loadStoreRoleConfig,
} = require("../../../utils/config/storeRoleConfigManager");
const {
  loadKeihiConfig,
  saveKeihiConfig,
} = require("../../../utils/keihi/keihiConfigManager");
const { postKeihiSettingPanel } = require("./keihiPanelHandler");

// 表示用ラベル
const LABEL_BY_TYPE = {
  approval: "承認役職",
  view: "閲覧役職",
  apply: "申請役職",
};

/**
 * 役職選択メニューを表示
 * @param {import('discord.js').ButtonInteraction} interaction
 * @param {'approval'|'view'|'apply'} type
 */
async function openRoleSelect(interaction, type) {
  const guildId = interaction.guild.id;

  try {
    const storeRoleConfig = await loadStoreRoleConfig(guildId);
    const allRoles = storeRoleConfig.roles || [];

    if (!allRoles.length) {
      return interaction.reply({
        content: "⚠️ 店舗・役職設定がまだ登録されていません。\n先に「店舗・役職設定」で役職を紐づけてください。",
        ephemeral: true,
      });
    }

    const options = allRoles.slice(0, 25).map((r) => ({
      label: r.name,
      value: r.id,
    }));

    const label = LABEL_BY_TYPE[type] || "役職";

    const select = new StringSelectMenuBuilder()
      .setCustomId(`keihi_role_select:${type}`)
      .setPlaceholder("役職を選択してください（複数可）")
      .setMinValues(0)
      .setMaxValues(Math.min(options.length, 25))
      .addOptions(options);

    return interaction.reply({
      content: `設定したい役職を選択してください（${label}）`,
      components: [new ActionRowBuilder().addComponents(select)],
      ephemeral: true,
    });
  } catch (err) {
    logger.error("[keihiRoleHandler] openRoleSelect エラー:", err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction
        .reply({
          content: "⚠️ 役職一覧の取得中にエラーが発生しました。",
          ephemeral: true,
        })
        .catch(() => {});
    }
  }
}

/**
 * 選択された役職を保存
 * @param {import('discord.js').StringSelectMenuInteraction} interaction
 * @param {'approval'|'view'|'apply'} type
 */
async function saveRoles(interaction, type) {
  const guild = interaction.guild;
  const guildId = guild.id;
  const selectedRoleIds = interaction.values ?? [];

  try {
    const keihiConfig = await loadKeihiConfig(guildId);

    if (type === "approval") {
      keihiConfig.approvalRoles = selectedRoleIds;
    } else if (type === "view") {
      keihiConfig.viewRoles = selectedRoleIds;
    } else if (type === "apply") {
      keihiConfig.applyRoles = selectedRoleIds;
    }

    await saveKeihiConfig(guildId, keihiConfig);

    const label = LABEL_BY_TYPE[type] || "役職";
    let mentions = "未設定";

    if (selectedRoleIds.length > 0) {
      // キャッシュにない場合も考慮し、fetchを使用してロールを確実に取得する
      const rolePromises = selectedRoleIds.map((id) =>
        guild.roles.fetch(id).catch(() => null)
      );
      const roles = await Promise.all(rolePromises);

      mentions = roles
        .map((role) =>
          role ? role.toString() : "`削除済みロール`"
        )
        .join("　");
    }

    // 🔹 ここがポイント：新しいメッセージを reply せず、
    //    セレクトを出していたエフェメラルメッセージを update する
    await interaction.update({
      content: `✅ ${label}を更新しました。\n${mentions}`,
      components: [],
    });

    return;
  } catch (err) {
    logger.error("[keihiRoleHandler] saveRoles エラー:", err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction
        .reply({
          content: "⚠️ 役職設定の保存中にエラーが発生しました。",
          ephemeral: true,
        })
        .catch(() => {});
    }
  }
}

module.exports = {
  openRoleSelect,
  saveRoles,
};
