// 店舗とロール紐づけ - ロール選択

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
  customId: 'CONFIG_SELECT_ROLES_FOR_STORE',

  async show(interaction, storeName) {
    const guildId = interaction.guild.id;
    const config = await loadStoreRoleConfig(guildId);
    const selected = config.storeRoles?.[storeName] || [];

    const menu = new RoleSelectMenuBuilder()
      .setCustomId(`CONFIG_SELECT_ROLES_FOR_STORE_VALUE_${storeName}`)
      .setPlaceholder('紐づけたいロールを選択')
      .setMinValues(0)
      .setMaxValues(25)
      .setDefaultRoles(selected);

    const row = new ActionRowBuilder().addComponents(menu);

    await interaction.update({
      content: `🏪 **${storeName}** に紐づけるロールを選択してください。`,
      components: [row],
    });
  },

  async handle(interaction) {
    const customId = interaction.customId;
    const storeName = customId.replace('CONFIG_SELECT_ROLES_FOR_STORE_VALUE_', '');

    const selectedRoles = interaction.values;
    const guildId = interaction.guild.id;

    const config = await loadStoreRoleConfig(guildId);
    const before = config.storeRoles?.[storeName] || [];

    config.storeRoles[storeName] = selectedRoles;
    await saveStoreRoleConfig(guildId, config);

    const added = selectedRoles.filter((r) => !before.includes(r));
    const removed = before.filter((r) => !selectedRoles.includes(r));

    let logMsg =
      `🏪 **店舗とロールの紐づけ変更**\n店舗：${storeName}\n`;

    if (added.length) logMsg += `➕ 追加：${added.map((r) => `<@&${r}>`).join(', ')}\n`;
    if (removed.length) logMsg += `➖ 削除：${removed.map((r) => `<@&${r}>`).join(', ')}\n`;

    await sendSettingLog(interaction.guild, {
      user: interaction.user,
      message: logMsg,
      type: '店舗ロール紐づけ変更',
    });

    await interaction.update({
      content: `✅ ${storeName} のロール紐づけを保存しました。`,
      components: [],
    });

    await sendConfigPanel(interaction.channel);
  },
};
