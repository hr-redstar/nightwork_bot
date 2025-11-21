// src/handlers/config/components/select/select_position_roles.js
// ----------------------------------------------------
// Step2：選んだ役職に紐づける Discord ロールを選択
// ----------------------------------------------------

const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require('discord.js');

const {
  loadStoreRoleConfig,
  saveStoreRoleConfig,
} = require('../../../utils/config/storeRoleConfigManager');

const { getRoleObjects } = require('../../../utils/config/configAccessor');
const { postConfigPanel } = require('../configPanel');
const { sendSettingLog } = require('../configLogger');

module.exports = {
  customId: 'CONFIG_SELECT_POSITION_ROLES',

  async show(interaction, positionId) {
    const roles = await getRoleObjects(interaction.guild.id);

    if (!roles.length) {
      return interaction.update({
        content: '⚠️ 登録されているロールがありません。',
        components: [],
      });
    }

    // 表示名の取得
    const config = await loadStoreRoleConfig(interaction.guild.id);
    const positionName = config.roles.find((r) => r.id === positionId)?.name || positionId;

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`CONFIG_SELECT_POSITION_ROLES_${positionId}`)
      .setPlaceholder(`${positionName} に紐づけるロールを選択`)
      .setMinValues(0)
      .setMaxValues(roles.length)
      .addOptions(
        roles.map((r) => ({
          label: r.name,
          value: r.id,
        }))
      );

    const row = new ActionRowBuilder().addComponents(menu);

    await interaction.update({
      content: `👔 **${positionName}** に紐づけるロールを選択してください。`,
      components: [row],
    });
  },

  async handle(interaction) {
    const customId = interaction.customId;

    // CONFIG_SELECT_POSITION_ROLES_<positionId>
    const positionId = customId.replace('CONFIG_SELECT_POSITION_ROLES_', '');

    const selectedRoleIds = interaction.values; // Array of roleId
    const guildId = interaction.guild.id;

    const config = await loadStoreRoleConfig(guildId);

    // フィールドがなければ作成
    if (!config.positionRoles) config.positionRoles = {};

    const old = config.positionRoles[positionId] || [];

    // 保存
    config.positionRoles[positionId] = selectedRoleIds;

    await saveStoreRoleConfig(guildId, config);

    // ログ用
    const added = selectedRoleIds.filter((x) => !old.includes(x));
    const removed = old.filter((x) => !selectedRoleIds.includes(x));

    const positionName = config.roles.find((r) => r.id === positionId)?.name || positionId;

    let logMsg = `👔 **役職とロールの紐づけが更新されました**\n役職: **${positionName}**\n`;
    if (added.length) logMsg += `➕ 追加: ${added.map((id) => `<@&${id}>`).join(', ')}\n`;
    if (removed.length) logMsg += `➖ 削除: ${removed.map((id) => `<@&${id}>`).join(', ')}\n`;

    await sendSettingLog(interaction.guild, {
      user: interaction.user,
      message: logMsg,
      type: '役職ロール紐づけ',
    });

    await interaction.update({
      content: `✅ **${positionName}** のロール紐づけを更新しました。`,
      components: [],
    });

    // パネル再描画
    await postConfigPanel(interaction.channel);
  },
};
