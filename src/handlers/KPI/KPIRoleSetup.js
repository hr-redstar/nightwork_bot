/**
 * src/handlers/KPI/KPIRoleSetup.js
 * KPI申請役職設定を処理
 */

const {
  ActionRowBuilder,
  RoleSelectMenuBuilder,
  MessageFlags,
} = require('discord.js');
const { getGuildConfig, setGuildConfig } = require('../../utils/config/gcsConfigManager');
const { postOrUpdateKpiStorePanel } = require('./KPIPanel_Store');

/**
 * 「👤 KPI申請役職」ボタン押下 → 役職選択メニュー表示
 */
async function handleRoleSelectStart(interaction) {
  const storeName = interaction.customId.replace('kpi_set_role_', '');

  const row = new ActionRowBuilder().addComponents(
    new RoleSelectMenuBuilder()
      .setCustomId(`kpi_select_role_${storeName}`)
      .setPlaceholder(`KPI申請役職を選択`)
  );

  await interaction.reply({
    content: `👥 店舗 **${storeName}** の KPI申請役職を選択してください。`,
    components: [row],
    flags: MessageFlags.Ephemeral
  });
}

/**
 * 役職が選択されたときに呼ばれる
 */
async function handleRoleSelectSubmit(interaction) {
  const storeName = interaction.customId.replace('kpi_select_role_', '');
  const selectedRole = interaction.roles.first();

  if (!selectedRole) {
    return await interaction.reply({
      content: '⚠️ 役職が選択されていません。',
      flags: MessageFlags.Ephemeral
    });
  }

  const guildId = interaction.guild.id;
  const config = (await getGuildConfig(guildId)) || {};

  // KPI情報を初期化して保存
  if (!config.KPI) config.KPI = {};
  if (!config.KPI[storeName]) config.KPI[storeName] = {};
  config.KPI[storeName].approveRole = selectedRole.id;

  await setGuildConfig(guildId, config);

  // パネルを更新
  const storeChannel = interaction.channel;
  await postOrUpdateKpiStorePanel(storeChannel, storeName, interaction);

  await interaction.followUp({
    content: `✅ 店舗 **${storeName}** のKPI申請役職を <@&${selectedRole.id}> に設定しました。`,
    flags: MessageFlags.Ephemeral
  });
}

module.exports = {
  handleRoleSelectStart,
  handleRoleSelectSubmit,
};
