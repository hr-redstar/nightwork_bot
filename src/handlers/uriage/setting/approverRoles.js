// src/handlers/uriage/setting/approverRoles.js
// ----------------------------------------------------
// 売上 承認役職設定フロー
//   - ボタン「承認役職」
//   - 店舗選択 → 役職選択 → GCS保存
// ----------------------------------------------------

const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  RoleSelectMenuBuilder,
} = require('discord.js');
const { IDS } = require('./ids');
const {
  loadStoreRoleConfig,
} = require('../../../utils/config/storeRoleConfigManager');
const {
  loadUriageConfig,
  saveUriageConfig,
} = require('../../../utils/uriage/uriageConfigManager');
// const { sendSettingLog } = require('../../../utils/config/configLogger'); // ログ出力したくなったら使う

/**
 * 「承認役職」ボタン押下 → 店舗選択
 * @param {import('discord.js').ButtonInteraction} interaction
 */
async function openApproverRoleSelector(interaction) {
  const guildId = interaction.guild.id;
  const storeRoleConfig = await loadStoreRoleConfig(guildId);
  const stores = Array.isArray(storeRoleConfig?.stores)
    ? storeRoleConfig.stores
    : [];

  if (stores.length === 0) {
    return interaction.reply({
      content: '店舗情報が登録されていません。\n先に /設定店舗情報 などで店舗を登録してください。',
      ephemeral: true,
    });
  }

  const options = stores.map((store) => ({
    label: String(store.name ?? '店舗'),
    value: String(store.id ?? store.name),
  }));

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(IDS.SELECT_STORE_FOR_APPROVER)
      .setPlaceholder('承認役職を設定する店舗を選択')
      .addOptions(options),
  );

  return interaction.reply({
    content: '承認役職を設定する店舗を選択してください。',
    components: [row],
    ephemeral: true,
  });
}

/**
 * 店舗選択 → 役職選択メニュー表示
 * @param {import('discord.js').StringSelectMenuInteraction} interaction
 */
async function handleApproverStoreSelect(interaction) {
  const storeKey = interaction.values[0];

  const row = new ActionRowBuilder().addComponents(
    new RoleSelectMenuBuilder()
      .setCustomId(`${IDS.SELECT_ROLE_FOR_APPROVER}:${storeKey}`)
      .setPlaceholder('承認役職に設定するロールを選択')
      .setMinValues(0)
      .setMaxValues(25),
  );

  return interaction.update({
    content: `店舗「${storeKey}」の承認役職に設定するロールを選択してください。`,
    components: [row],
  });
}

/**
 * 役職選択 → GCS保存
 * @param {import('discord.js').RoleSelectMenuInteraction} interaction
 */
async function handleApproverRoleSelect(interaction) {
  const customId = interaction.customId;
  const prefix = `${IDS.SELECT_ROLE_FOR_APPROVER}:`;
  const storeKey = customId.slice(prefix.length);

  const guildId = interaction.guild.id;
  const roleIds = interaction.values || [];

  const config = await loadUriageConfig(guildId);
  config.panels = config.panels || {};
  const panel = config.panels[storeKey] || {};

  panel.approverRoleIds = roleIds;
  config.panels[storeKey] = panel;

  await saveUriageConfig(guildId, config);

  const mentionText =
    roleIds.length > 0 ? roleIds.map((id) => `<@&${id}>`).join(' ') : '（なし）';

  return interaction.update({
    content: `店舗「${storeKey}」の承認役職を更新しました。\n承認役職: ${mentionText}`,
    components: [],
  });
}

module.exports = {
  openApproverRoleSelector,
  handleApproverStoreSelect,
  handleApproverRoleSelect,
};