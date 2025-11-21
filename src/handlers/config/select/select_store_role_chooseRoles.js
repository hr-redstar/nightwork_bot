// src/handlers/config/components/select/select_store_role_chooseRoles.js
// ----------------------------------------------------
// Step 2: 店舗に紐づけるロールを選択
// ----------------------------------------------------

const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require('discord.js');

const {
  getRoleObjects
} = require('../../../utils/config/configAccessor');

const {
  linkStoreRole,
  saveStoreRoleConfig,
  loadStoreRoleConfig
} = require('../../../utils/config/storeRoleConfigManager');

const { postConfigPanel } = require('../configPanel');

module.exports = {
  customId: 'CONFIG_LINK_ROLES_FOR_STORE',

  async show(interaction, storeName) {
    const roles = await getRoleObjects(interaction.guild.id);

    if (!roles.length) {
      return interaction.update({
        content: '❌ 登録されている役職がありません。',
        components: [],
      });
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`CONFIG_LINK_ROLES_FOR_STORE_${storeName}`)
      .setPlaceholder(`店舗「${storeName}」に紐づけるロールを選択`)
      .setMinValues(0)
      .setMaxValues(roles.length)
      .addOptions(roles.map((r) => ({
        label: r.name,
        value: r.id,
      })));

    const row = new ActionRowBuilder().addComponents(menu);

    await interaction.update({
      content: `🎭 店舗 **${storeName}** に紐づけるロールを選択してください`,
      components: [row],
    });
  },

  async handle(interaction) {
    const customId = interaction.customId;

    // customId = CONFIG_LINK_ROLES_FOR_STORE_<storeName>
    const storeName = customId.replace('CONFIG_LINK_ROLES_FOR_STORE_', '');
    const selectedRoleIds = interaction.values; // 複数選択

    const guildId = interaction.guild.id;

    // 現在の設定をロード
    const config = await loadStoreRoleConfig(guildId);

    // 店舗の紐づけを更新
    config.storeRoles[storeName] = selectedRoleIds;

    await saveStoreRoleConfig(guildId, config);

    await interaction.update({
      content: `🔗 店舗 **${storeName}** にロールを紐づけました。\n${selectedRoleIds.map(id => `<@&${id}>`).join('\n') || '（なし）'}`,
      components: [],
    });

    // 設定パネルを再描画
    await postConfigPanel(interaction.channel);
  },
};
