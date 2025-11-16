/**
 * src/handlers/KPI/kpiRoleHandler.js
 * KPI承認役職の設定フロー
 */
const { ActionRowBuilder, RoleSelectMenuBuilder, MessageFlags } = require('discord.js');
const { getKpiConfig, saveKpiConfig } = require('../../utils/KPI/kpiDataManager');
const { postKpiPanel } = require('./kpiPanel');
const logger = require('../../utils/logger');

/**
 * 「KPI承認役職」ボタンが押されたときの処理
 * @param {import('discord.js').ButtonInteraction} interaction
 */
async function handleRoleSetup(interaction) {
  try {
    const config = await getKpiConfig(interaction.guild.id);
    const currentRoles = config.approvalRoles || [];

    const roleSelect = new RoleSelectMenuBuilder()
      .setCustomId('kpi_select_role')
      .setPlaceholder('承認役職を選択してください（複数選択可）')
      .setMinValues(0) // 0件選択で「設定なし」にできる
      .setMaxValues(5);

    // 現在設定されている役職をデフォルトで選択状態にする
    if (currentRoles.length > 0) {
      roleSelect.setDefaultRoles(currentRoles);
    }

    await interaction.reply({
      content: '🛡️ KPIを承認できる役職を設定してください。',
      components: [new ActionRowBuilder().addComponents(roleSelect)],
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    logger.error('KPI承認役職の設定UI表示中にエラー:', error);
    await interaction.reply({ content: '⚠️ 設定画面の表示中にエラーが発生しました。', flags: MessageFlags.Ephemeral });
  }
}

/**
 * 役職が選択された後の処理
 * @param {import('discord.js').RoleSelectMenuInteraction} interaction
 */
async function handleRoleSelect(interaction) {
  try {
    const selectedRoles = interaction.values;
    const config = await getKpiConfig(interaction.guild.id);

    config.approvalRoles = selectedRoles;
    await saveKpiConfig(interaction.guild.id, config);

    // 設定パネルを更新して変更を反映
    await postKpiPanel(interaction.channel);

    await interaction.update({ content: '✅ KPI承認役職を更新しました。', components: [] });
  } catch (error) {
    logger.error('KPI承認役職の保存中にエラー:', error);
    await interaction.update({ content: '⚠️ 役職の保存中にエラーが発生しました。', components: [] });
  }
}

module.exports = { handleRoleSetup, handleRoleSelect };