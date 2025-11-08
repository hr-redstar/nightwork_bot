/**
 * src/handlers/KPI/KPISetupHandler.js
 * KPI設定パネルのボタン操作・選択処理
 */

const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  MessageFlags,
} = require('discord.js');
const { getGuildConfig, setGuildConfig } = require('../../utils/config/gcsConfigManager');
const { postOrUpdateKpiStorePanel } = require('./KPIPanel_Store'); // This seems unused here, but I'll leave it.

// ------------------------------------
// KPI設置 → 店舗＆チャンネル選択
// ------------------------------------
async function handleKpiSetupStore(interaction) {
  const guild = interaction.guild;
  const storeOptions = guild.channels.cache
    .filter((ch) => ch.type === 0) // TextChannel
    .map((ch) =>
      new StringSelectMenuOptionBuilder()
        .setLabel(ch.name)
        .setDescription('KPIを設置するチャンネル')
        .setValue(ch.id)
    );

  const menu = new StringSelectMenuBuilder()
    .setCustomId('kpi_select_channel')
    .setPlaceholder('KPIを設置するテキストチャンネルを選択')
    .addOptions(storeOptions.slice(0, 25));

  await interaction.reply({
    content: '📍 KPIを設置するチャンネルを選択してください。',
    components: [new ActionRowBuilder().addComponents(menu)],
    flags: MessageFlags.Ephemeral
  });
}

// ------------------------------------
// KPI承認役職 → 役職リスト選択
// ------------------------------------
async function handleKpiSetupRole(interaction) {
  const guild = interaction.guild;
  const roleOptions = guild.roles.cache
    .filter((r) => r.name !== '@everyone')
    .map((r) =>
      new StringSelectMenuOptionBuilder()
        .setLabel(r.name)
        .setValue(r.id)
    );

  const menu = new StringSelectMenuBuilder()
    .setCustomId('kpi_setup_approve_role')
    .setPlaceholder('KPI承認役職を選択してください')
    .addOptions(roleOptions.slice(0, 25));

  await interaction.reply({
    content: '👑 KPI承認役職を選択してください。',
    components: [new ActionRowBuilder().addComponents(menu)],
    flags: MessageFlags.Ephemeral
  });
}

// ------------------------------------
// KPI設置チャンネル選択完了
// ------------------------------------
async function handleKpiChannelSelect(interaction) {
  const channelId = interaction.values[0];
  const channel = interaction.guild.channels.cache.get(channelId);
  const guildId = interaction.guild.id;
  const config = await getGuildConfig(guildId);
  if (!config.KPI) config.KPI = {};

  config.KPI[channel.name] = {
    channelId,
    channelLink: `<#${channelId}>`,
  };

  await setGuildConfig(guildId, config);
  await postOrUpdateKpiStorePanel(channel, channel.name);

  await interaction.reply({
    content: `✅ KPIパネルを **${channel.name}** に設置しました。`,
    flags: MessageFlags.Ephemeral
  });
}

// ------------------------------------
// KPI承認役職選択完了
// ------------------------------------
async function handleKpiRoleSelect(interaction) {
  const roleId = interaction.values[0];
  const roleName = interaction.guild.roles.cache.get(roleId)?.name;
  const guildId = interaction.guild.id;
  const config = await getGuildConfig(guildId);
  if (!config.KPI) config.KPI = {};
  if (!config.KPI.global) config.KPI.global = {};

  config.KPI.global.approveRole = roleId;
  config.KPI.global.approveRoleName = roleName;

  await setGuildConfig(guildId, config);

  await interaction.reply({
    content: `👑 KPI承認役職を **${roleName}** に設定しました。`,
    flags: MessageFlags.Ephemeral
  });
}

module.exports = {
  handleKpiSetupStore,
  handleKpiSetupRole,
  handleKpiChannelSelect,
  handleKpiRoleSelect,
};
