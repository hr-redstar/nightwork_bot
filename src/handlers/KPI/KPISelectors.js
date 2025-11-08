/**
 * src/handlers/KPI/KPISelectors.js
 */
const { getGuildConfig, setGuildConfig } = require('../../utils/config/gcsConfigManager');
const { postOrUpdateKpiStorePanel } = require('./KPIPanel_Store');
const { MessageFlags } = require('discord.js');

// 承認役職選択処理
async function handleRoleSelect(interaction) {
  const storeName = interaction.customId.replace('kpi_role_', '');
  const roleId = interaction.values[0];
  const roleName = interaction.guild.roles.cache.get(roleId)?.name || '不明';

  const guildId = interaction.guild.id;
  const config = await getGuildConfig(guildId);
  if (!config.KPI) config.KPI = {};
  if (!config.KPI[storeName]) config.KPI[storeName] = {};

  config.KPI[storeName].approveRole = roleId;
  config.KPI[storeName].approveRoleName = roleName;
  await setGuildConfig(guildId, config);

  await postOrUpdateKpiStorePanel(interaction.channel, storeName);
  await interaction.reply({
    content: `✅ 店舗「${storeName}」の承認役職を **${roleName}** に設定しました。`,
    flags: MessageFlags.Ephemeral
  });
}

// 店舗選択処理（複数店舗運用時）
async function handleStoreSelect(interaction) {
  const storeName = interaction.values[0];
  await postOrUpdateKpiStorePanel(interaction.channel, storeName);
  await interaction.reply({
    content: `✅ 店舗「${storeName}」のKPIパネルを表示しました。`,
    flags: MessageFlags.Ephemeral
  });
}

module.exports = { handleRoleSelect, handleStoreSelect };
