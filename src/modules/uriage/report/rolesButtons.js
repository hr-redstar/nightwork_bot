// src/handlers/uriage/report/rolesButtons.js
const { ActionRowBuilder, StringSelectMenuBuilder, MessageFlags } = require('discord.js');
const { loadUriageStoreConfig, saveUriageStoreConfig } = require('../../../utils/uriage/uriageConfigManager');
const { refreshUriageReportPanelMessage } = require('../setting/panel');
const { loadStoreRoleConfig } = require('../../../utils/config/storeRoleConfigManager');

/**
 * 閲覧役職ボタン：役職選択メニューを表示
 */
async function handleViewRolesButton(interaction, storeId) {
  const storeRoleConfig = await loadStoreRoleConfig(interaction.guildId).catch(() => null);
  const positions = storeRoleConfig?.roles || [];

  if (!positions.length) {
    return interaction.reply({
      content: '役職が設定されていません。先に「/設定」から役職設定を行ってください。',
      flags: MessageFlags.Ephemeral,
    });
  }

  const options = positions.map(pos => ({
    label: pos.name,
    value: String(pos.id),
  })).slice(0, 25);

  const select = new StringSelectMenuBuilder()
    .setCustomId(`uriage_report:sel:view_roles:${storeId}`)
    .setPlaceholder('閲覧可能な役職を選択してください')
    .setMinValues(0)
    .setMaxValues(options.length)
    .addOptions(options);

  const row = new ActionRowBuilder().addComponents(select);

  return interaction.reply({
    content: `**${storeId}** の閲覧役職を設定します。`,
    components: [row],
    flags: MessageFlags.Ephemeral,
  });
}

/**
 * 申請役職ボタン：役職選択メニューを表示
 */
async function handleRequestRolesButton(interaction, storeId) {
  const storeRoleConfig = await loadStoreRoleConfig(interaction.guildId).catch(() => null);
  const positions = storeRoleConfig?.roles || [];

  if (!positions.length) {
    return interaction.reply({
      content: '役職が設定されていません。先に「/設定」から役職設定を行ってください。',
      flags: MessageFlags.Ephemeral,
    });
  }

  const options = positions.map(pos => ({
    label: pos.name,
    value: String(pos.id),
  })).slice(0, 25);

  const select = new StringSelectMenuBuilder()
    .setCustomId(`uriage_report:sel:request_roles:${storeId}`)
    .setPlaceholder('報告/申請可能な役職を選択してください')
    .setMinValues(0)
    .setMaxValues(options.length)
    .addOptions(options);

  const row = new ActionRowBuilder().addComponents(select);

  return interaction.reply({
    content: `**${storeId}** の申請役職を設定します。`,
    components: [row],
    flags: MessageFlags.Ephemeral,
  });
}

/**
 * 閲覧役職セレクト：必ず deferReply → editReply（これが一番事故らない）
 */
async function handleViewRolesSelect(interaction, storeId) {
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ ephemeral: true });
  }

  const guildId = interaction.guildId;
  const roleIds = interaction.values;

  const storeCfg = (await loadUriageStoreConfig(guildId, storeId)) || {};
  storeCfg.viewRoleIds = roleIds; // panel.js のキー名に合わせる
  await saveUriageStoreConfig(guildId, storeId, storeCfg);

  const success = await refreshUriageReportPanelMessage(interaction.guild, storeId).catch(() => false);

  return interaction.editReply({
    content: success
      ? `✅ **${storeId}** の閲覧役職を保存し、パネルを更新しました。`
      : `⚠️ 設定は保存しましたが、パネル更新に失敗しました（パネルが見つからないか、権限不足の可能性があります）。`,
  });
}

/**
 * 申請役職セレクト：こっちも必ず返信
 */
async function handleRequestRolesSelect(interaction, storeId) {
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ ephemeral: true });
  }

  const guildId = interaction.guildId;
  const roleIds = interaction.values;

  const storeCfg = (await loadUriageStoreConfig(guildId, storeId)) || {};
  storeCfg.requestRoleIds = roleIds; // panel.js のキー名に合わせる
  await saveUriageStoreConfig(guildId, storeId, storeCfg);

  const success = await refreshUriageReportPanelMessage(interaction.guild, storeId).catch(() => false);

  return interaction.editReply({
    content:
      success
        ? `✅ **${storeId}** の申請役職を保存し、パネルを更新しました。`
        : `⚠️ 設定は保存しましたが、パネル更新に失敗しました（パネルが見つからないか、権限不足の可能性があります）。`,
  });
}

module.exports = {
  handleViewRolesButton,
  handleRequestRolesButton,
  handleViewRolesSelect,
  handleRequestRolesSelect,
};