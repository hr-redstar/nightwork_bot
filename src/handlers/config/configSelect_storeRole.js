// src/handlers/config/configSelect_storeRole.js
const { getGuildConfig, setGuildConfig } = require('../../utils/config/gcsConfigManager');

/**
 * 役職選択完了 → 保存処理
 */
async function handleStoreRoleSelect(interaction, storeName) {
  const guildId = interaction.guild.id;
  const selectedRole = interaction.roles.first();
  const config = (await getGuildConfig(guildId)) || {};

  if (!config.storeRoleMapping) {
    config.storeRoleMapping = {};
  }
  config.storeRoleMapping[storeName] = {
    roleId: selectedRole.id,
    roleName: selectedRole.name,
  };

  await setGuildConfig(guildId, config);

  await interaction.update({
    content: `✅ 店舗 **${storeName}** に役職 **@${selectedRole.name}** を紐付けました。`,
    components: [],
  });
}

module.exports = {
  handleStoreRoleSelect,
};
