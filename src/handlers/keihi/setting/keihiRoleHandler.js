// src/handlers/keihi/keihiRoleHandler.js
//-----------------------------------------------------
// 経費設定：承認 / 閲覧 / 申請役職の設定
//-----------------------------------------------------

const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");

const { loadStoreRoleConfig } = require("../../../utils/config/storeRoleConfigManager");
const { loadKeihiConfig, saveKeihiConfig } = require("../../../utils/keihi/keihiConfigManager");
const { postKeihiSettingPanel } = require("./keihiPanel_Setting");
const { sendSettingLog } = require("../../../utils/config/configLogger");


module.exports = {

  /**
   * 役職選択メニューを表示
   * @param {*} interaction
   * @param {"approval"|"view"|"apply"} type
   */
  async openRoleSelect(interaction, type) {
    const guildId = interaction.guildId;

    const storeConfig = await loadStoreRoleConfig(guildId);
    const roles = storeConfig.roles || []; // [{id,name}]

    if (!roles.length) {
      return interaction.reply({
        content: "⚠️ 設定できる役職がありません。",
        ephemeral: true
      });
    }

    // --- SelectMenuを生成 ---
    const select = new StringSelectMenuBuilder()
      .setCustomId(`keihi_role_select:${type}`)
      .setPlaceholder("役職を選択してください（複数可）")
      .setMinValues(0)
      .setMaxValues(roles.length);

    roles.forEach((role) => {
      select.addOptions({
        label: role.name,
        value: role.id,
      });
    });

    const row = new ActionRowBuilder().addComponents(select);

    return interaction.reply({
      content: `設定したい役職を選択してください（${roleLabel(type)}）`,
      components: [row],
      ephemeral: true,
    });
  },


  /**
   * 選択された役職を keihiConfig.json に保存
   * @param {*} interaction
   * @param {"approval"|"view"|"apply"} type
   */
  async saveRoles(interaction, type) {
    const guildId = interaction.guildId;
    const selectedRoles = interaction.values; // role IDs[]

    const config = await loadKeihiConfig(guildId);
    config[`${type}Roles`] = selectedRoles;

    await saveKeihiConfig(guildId, config);

    // パネル更新（通常メッセージの編集）
    await postKeihiSettingPanel(interaction);

    // 設定ログ送信
    await sendSettingLog(guildId, {
      type: "keihi_role_update",
      action: `${roleLabel(type)}役職を更新`,
      roles: selectedRoles,
      userId: interaction.user.id
    });

    return interaction.editReply({
      content: "✅ 役職設定を更新しました。",
      components: []
    });
  }

};


/** 役職名のラベル変換 */
function roleLabel(key) {
  return key === "approval"
    ? "承認"
    : key === "view"
    ? "閲覧"
    : key === "apply"
    ? "申請"
    : key;
}
