// src/handlers/keihi/経費設定/keihiRoleHandler.js
// 経費関連の役職設定フロー

const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { getKeihiConfig, saveKeihiConfig } = require('../../../utils/keihi/gcsKeihiManager');
const { loadStoreRoleConfig } = require('../../../utils/config/storeRoleConfigManager');
const { sendSettingLog } = require('../../../utils/keihi/embedLogger'); // Assuming embedLogger for keihi exists
const { updateKeihiPanel } = require('./keihiPanel_Config');
const { IDS } = require('./ids');

// This is a placeholder, assuming a ROLE_FLOW for keihi will be added to keihi/ids.js
const ROLE_FLOW = {
  APPROVER: 'approver',
  VIEWER: 'viewer',
  APPLICANT: 'applicant',
};

/**
 * 役職選択UIを開く
 */
async function openApproveRoleSelect(interaction) {
  await openRoleSelect(interaction, ROLE_FLOW.APPROVER);
}
async function openViewRoleSelect(interaction) {
  await openRoleSelect(interaction, ROLE_FLOW.VIEWER);
}
async function openApplyRoleSelect(interaction) {
  await openRoleSelect(interaction, ROLE_FLOW.APPLICANT);
}

/**
 * 共通：役職選択メニュー生成
 */
async function openRoleSelect(interaction, roleType) {
  const guildId = interaction.guild.id;
  const storeRoles = await loadStoreRoleConfig(guildId);

  const roleList = storeRoles?.roles || [];

  if (!roleList?.length) {
    return interaction.reply({ content: '⚠️ 店舗_役職_ロール.json に役職情報がありません。', ephemeral: true });
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId(`keihi:select:role:${roleType}`) // Add roleType to customId
    .setPlaceholder('設定する役職を選択してください')
    .addOptions(
      roleList.map(r => ({
        label: r.name || r,
        value: r.id || r,
      }))
    );

  const row = new ActionRowBuilder().addComponents(select);

  await interaction.reply({
    content: `🎚️ **${getRoleLabel(roleType)}** の役職を選択してください。`,
    components: [row],
    ephemeral: true,
  });
}

/**
 * 選択された役職をGCSに保存
 */
async function handleRoleSelected(interaction) {
  const guildId = interaction.guild.id;
  const selectedRoleId = interaction.values[0];
  const rawId = interaction.customId || '';
  const parts = rawId.includes(':') ? rawId.split(':') : rawId.split('_');
  const roleType = parts[3]; // keihi:select:role:approver or keihi_select_role_approver

  if (!roleType) return interaction.update({ content: '⚠️ 役職タイプの特定に失敗しました。', components: [] });

  const config = await getKeihiConfig(guildId);
  if (roleType === ROLE_FLOW.APPROVER) config.approverRoles = [selectedRoleId];
  if (roleType === ROLE_FLOW.VIEWER) config.viewerRoles = [selectedRoleId];
  if (roleType === ROLE_FLOW.APPLICANT) config.applicantRoles = [selectedRoleId];

  await saveKeihiConfig(guildId, config);

  // パネルを更新
  await updateKeihiPanel(interaction);

  // ログ送信
  const roleMention = `<@&${selectedRoleId}>`;
  // await sendSettingLog(guildId, { ... }); // Placeholder for logging

  await interaction.update({ content: `✅ ${getRoleLabel(roleType)} を ${roleMention} に設定しました。`, components: [] });
}

/**
 * 種類ラベル取得
 */
function getRoleLabel(type) {
  switch (type) {
    case ROLE_FLOW.APPROVER: return '承認役職';
    case ROLE_FLOW.VIEWER: return '閲覧役職';
    case ROLE_FLOW.APPLICANT: return '申請役職';
    default: return '役職';
  }
}

module.exports = { openApproveRoleSelect, openViewRoleSelect, openApplyRoleSelect, handleRoleSelected };