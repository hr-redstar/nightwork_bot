// src/handlers/config/configSelect_roleRole.js
const {
  StringSelectMenuBuilder,
  ActionRowBuilder,
  MessageFlags,
  RoleSelectMenuBuilder,
} = require('discord.js');
const { postConfigPanel } = require('./configPanel');
const { sendSettingLog } = require('./configLogger');
const { loadStoreRoleConfig, updateLink } = require('../../utils/config/storeRoleConfigManager');

/**
 * 役職とロールの紐づけメニューを表示
 */
async function showPositionRoleSelect(interaction) {
  const guildId = interaction.guild.id;
  const config = await loadStoreRoleConfig(guildId);
  const positions = config.roles || [];

  if (positions.length === 0) {
    await interaction.reply({
      content: '⚠️ 先に役職を登録してください。',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const positionSelect = new StringSelectMenuBuilder()
    .setCustomId('select_position')
    .setPlaceholder('役職を選択')
    .addOptions(positions.map((p) => ({ label: p, value: p })));

  const row = new ActionRowBuilder().addComponents(positionSelect);

  await interaction.reply({
    content: '👔 役職を選択してください。',
    components: [row],
    flags: MessageFlags.Ephemeral,
  });
}

/**
 * 役職選択後、ロール選択メニューを表示
 */
async function showRoleSelectForPosition(interaction, positionName) {
  const roleSelect = new RoleSelectMenuBuilder()
    .setCustomId(`select_roles_for_position_${positionName}`)
    .setPlaceholder('紐づけるロールを選択')
    .setMinValues(1);

  const row = new ActionRowBuilder().addComponents(roleSelect);

  await interaction.update({
    content: `👔 **${positionName}** に紐づけるロールを選択してください。`,
    components: [row],
  });
}

/**
 * 紐づけ完了後の保存処理
 */
async function handlePositionRoleSelect(interaction, positionName) {
  const guildId = interaction.guild.id;
  const selectedRoles = interaction.values;
  const config = await loadStoreRoleConfig(guildId);

  const oldRoles = config.link_role_role?.[positionName] || [];

  // 新しいマネージャーで紐づけを更新
  await updateLink(guildId, 'link_role_role', positionName, selectedRoles);

  // 差分ログ作成
  const added = selectedRoles.filter((r) => !oldRoles.includes(r));
  const removed = oldRoles.filter((r) => !selectedRoles.includes(r));

  let logMsg = `👔 **役職とロールの紐づけが更新されました**\n役職: **${positionName}**\n`;
  if (added.length) logMsg += `➕ 追加: ${added.map((r) => `<@&${r}>`).join(', ')}\n`;
  if (removed.length) logMsg += `➖ 削除: ${removed.map((r) => `<@&${r}>`).join(', ')}\n`;

  await sendSettingLog(interaction.guild, {
    user: interaction.user,
    message: logMsg,
    type: '役職ロール紐づけ変更',
  });

  await interaction.update({
    content: `✅ **${positionName}** のロール紐づけを更新しました。`,
    components: [],
  });

  await postConfigPanel(interaction.channel);
}

module.exports = {
  showPositionRoleSelect,
  showRoleSelectForPosition,
  handlePositionRoleSelect,
};
