// 役職とロール紐づけ - Step2 ロール選択
// ----------------------------------------------------

const {
  ActionRowBuilder,
  RoleSelectMenuBuilder,
  MessageFlags,
} = require('discord.js');

const {
  loadStoreRoleConfig,
  saveStoreRoleConfig,
} = require('../../../../utils/config/storeRoleConfigManager');

const { sendSettingLog } = require('../../configLogger');
const { sendConfigPanel } = require('../../configPanel');

module.exports = {
  customId: 'CONFIG_SELECT_ROLES_FOR_POSITION',

  /**
   * ロール選択メニューを表示
   */
  async show(interaction, positionId) {
    const guildId = interaction.guild.id;
    const config = await loadStoreRoleConfig(guildId);

    const roleInfo = config.roles.find((r) => r.id === positionId);
    const roleName = roleInfo?.name || positionId;

    const selected = config.positionRoles?.[positionId] || [];

    const menu = new RoleSelectMenuBuilder()
      .setCustomId(`CONFIG_SELECT_ROLES_FOR_POSITION_VALUE_${positionId}`)
      .setPlaceholder(`${roleName} に紐づけるロールを選択`)
      .setMinValues(0)
      .setMaxValues(25)
      .setDefaultRoles(selected);

    const row = new ActionRowBuilder().addComponents(menu);

    await interaction.update({
      content: `👔 **${roleName}** に紐づけるロールを選択してください。`,
      components: [row],
    });
  },

  /**
   * 紐づけ保存処理
   */
  async handle(interaction) {
    // customId: CONFIG_SELECT_ROLES_FOR_POSITION_VALUE_<positionId>
    const positionId = interaction.customId.replace('CONFIG_SELECT_ROLES_FOR_POSITION_VALUE_', '');
    const selectedRoles = interaction.values;

    const guildId = interaction.guild.id;
    const config = await loadStoreRoleConfig(guildId);

    const before = config.positionRoles?.[positionId] || [];

    config.positionRoles = config.positionRoles || {};
    config.positionRoles[positionId] = selectedRoles;

    await saveStoreRoleConfig(guildId, config);

    const added = selectedRoles.filter((r) => !before.includes(r));
    const removed = before.filter((r) => !selectedRoles.includes(r));

    let logMsg =
      `👔 **役職とロールの紐づけ変更**\n役職ID：${positionId}\n`;

    if (added.length) logMsg += `➕ 追加：${added.map((r) => `<@&${r}>`).join(', ')}\n`;
    if (removed.length) logMsg += `➖ 削除：${removed.map((r) => `<@&${r}>`).join(', ')}\n`;

    await sendSettingLog(interaction.guild, {
      user: interaction.user,
      message: logMsg,
      type: '役職ロール紐づけ変更',
    });

    await interaction.update({
      content: `✅ 役職のロール紐づけを保存しました。`,
      components: [],
    });

    await sendConfigPanel(interaction.channel);
  },
};
