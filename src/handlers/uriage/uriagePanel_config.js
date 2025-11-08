const {
  StringSelectMenuBuilder,
  ActionRowBuilder,
  ChannelType,
} = require('discord.js');
const { getGuildConfig, setGuildConfig } = require('../../utils/config/gcsConfigManager');
const { getStoreList } = require('../../utils/config/configAccessor');
const { postUriagePanel } = require('./uriagePanel');
const { sendSettingLog } = require('../config/configLogger');

/**
 * 売上報告パネル設置ボタン
 */
async function handleUriagePanelSetup(interaction) {
  const guildId = interaction.guild.id;
  const stores = await getStoreList(guildId);
  if (stores.length === 0)
    return interaction.reply({ content: '⚠️ 店舗が登録されていません。', ephemeral: true });

  const storeSelect = new StringSelectMenuBuilder()
    .setCustomId('uriage_select_store')
    .setPlaceholder('店舗を選択')
    .addOptions(stores.map((s) => ({ label: s, value: s })));

  const channels = interaction.guild.channels.cache
    .filter((ch) => ch.type === ChannelType.GuildText)
    .map((ch) => ({ label: ch.name, value: ch.id }));

  const channelSelect = new StringSelectMenuBuilder()
    .setCustomId('uriage_select_channel')
    .setPlaceholder('売上報告チャンネルを選択')
    .addOptions(channels.slice(0, 25));

  await interaction.reply({
    content: '🧾 店舗と売上報告チャンネルを選択してください。',
    components: [
      new ActionRowBuilder().addComponents(storeSelect),
      new ActionRowBuilder().addComponents(channelSelect),
    ],
    ephemeral: true,
  });
}

/**
 * 承認ロール設定
 */
async function handleApprovalRole(interaction) {
  const roles = interaction.guild.roles.cache
    .filter((r) => !r.managed)
    .map((r) => ({ label: r.name, value: r.id }));

  const roleSelect = new StringSelectMenuBuilder()
    .setCustomId('uriage_select_approval_roles')
    .setPlaceholder('承認ロールを選択')
    .setMinValues(1)
    .setMaxValues(Math.min(roles.length, 10))
    .addOptions(roles);

  await interaction.reply({
    content: '🧑‍💼 売上承認できるロールを選択してください。',
    components: [new ActionRowBuilder().addComponents(roleSelect)],
    ephemeral: true,
  });
}

/**
 * 閲覧ロール設定
 */
async function handleViewRole(interaction) {
  const roles = interaction.guild.roles.cache
    .filter((r) => !r.managed)
    .map((r) => ({ label: r.name, value: r.id }));

  const roleSelect = new StringSelectMenuBuilder()
    .setCustomId('uriage_select_view_roles')
    .setPlaceholder('閲覧ロールを選択')
    .setMinValues(1)
    .setMaxValues(Math.min(roles.length, 10))
    .addOptions(roles);

  await interaction.reply({
    content: '👀 売上報告スレッドを閲覧できるロールを選択してください。',
    components: [new ActionRowBuilder().addComponents(roleSelect)],
    ephemeral: true,
  });
}

/**
 * CSV発行
 */
async function handleCsvExport(interaction) {
  const guildId = interaction.guild.id;
  const stores = await getStoreList(guildId);
  if (stores.length === 0)
    return interaction.reply({ content: '⚠️ 店舗が登録されていません。', ephemeral: true });

  const storeSelect = new StringSelectMenuBuilder()
    .setCustomId('uriage_select_csv_store')
    .setPlaceholder('店舗を選択')
    .addOptions(stores.map((s) => ({ label: s, value: s })));

  await interaction.reply({
    content: '📊 CSVを発行する店舗を選択してください。',
    components: [new ActionRowBuilder().addComponents(storeSelect)],
    ephemeral: true,
  });
}

/**
 * 承認ロール保存
 */
async function saveApprovalRoles(interaction) {
  const guildId = interaction.guild.id;
  const config = (await getGuildConfig(guildId)) || {};
  config.uriageApprovalRoles = interaction.values;
  await setGuildConfig(guildId, config);

  await sendSettingLog(interaction.guild, {
    user: interaction.user,
    message: `🧑‍💼 承認ロールが更新されました：${interaction.values.map((r) => `<@&${r}>`).join(', ')}`,
    type: '売上設定',
  });

  await interaction.update({
    content: '✅ 承認ロールを更新しました。',
    components: [],
  });

  await postUriagePanel(interaction.channel);
}

/**
 * 閲覧ロール保存
 */
async function saveViewRoles(interaction) {
  const guildId = interaction.guild.id;
  const config = (await getGuildConfig(guildId)) || {};
  config.uriageViewRoles = interaction.values;
  await setGuildConfig(guildId, config);

  await sendSettingLog(interaction.guild, {
    user: interaction.user,
    message: `👀 閲覧ロールが更新されました：${interaction.values.map((r) => `<@&${r}>`).join(', ')}`,
    type: '売上設定',
  });

  await interaction.update({
    content: '✅ 閲覧ロールを更新しました。',
    components: [],
  });

  await postUriagePanel(interaction.channel);
}

module.exports = {
  handleUriagePanelSetup,
  handleApprovalRole,
  handleViewRole,
  handleCsvExport,
  saveApprovalRoles,
  saveViewRoles,
};
