// src/handlers/uriage/report/reportPanelRolesFlow.js
// ----------------------------------------------------
// 売上報告パネル内の「閲覧役職」「申請役職」設定フロー
// ----------------------------------------------------

const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder,
} = require('discord.js');
const { MessageFlags } = require('discord.js');

const logger = require('../../../utils/logger');
const { buildRoleSelectOptions } = require('../../../utils/config/roleSelectHelper');
const {
  loadUriageSetting,
  saveUriageSetting,
  getOrCreatePanel,
} = require('../../../utils/uriage/gcsUriageSettingManager');
const { sendSettingLog } = require('../../../utils/config/configLogger');

/**
 * 閲覧役職ボタン押下
 * @param {import('discord.js').ButtonInteraction} interaction
 */
async function handleViewRoleButton(interaction) {
  const guildId = interaction.guild.id;
  const storeName = interaction.customId.replace('URIAGE_VIEW_ROLE__', '');

  const roleOptions = await buildRoleSelectOptions(guildId);
  if (roleOptions.length === 0) {
    await interaction.reply({
      content: '役職設定が見つかりません。',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId(`URIAGE_SELECT_VIEW_ROLES__${storeName}`)
    .setPlaceholder(`店舗「${storeName}」の閲覧役職を選択してください（複数選択可）`)
    .setMinValues(1)
    .setMaxValues(Math.min(roleOptions.length, 10))
    .addOptions(roleOptions);

  const row = new ActionRowBuilder().addComponents(select);

  await interaction.reply({
    content: `店舗「${storeName}」の売上報告パネルで閲覧可能な役職を選択してください。`,
    components: [row],
    flags: MessageFlags.Ephemeral,
  });
}

/**
 * 閲覧役職セレクト
 * @param {import('discord.js').StringSelectMenuInteraction} interaction
 */
async function handleViewRolesSelect(interaction) {
  const guildId = interaction.guild.id;
  const user = interaction.user;
  const storeName = interaction.customId.replace('URIAGE_SELECT_VIEW_ROLES__', '');
  const selectedRoleIds = interaction.values;

  const setting = await loadUriageSetting(guildId);
  const panel = getOrCreatePanel(setting, storeName, interaction.message.channel.id);
  panel.viewRoles = selectedRoleIds;

  await saveUriageSetting(guildId, setting);

  await interaction.update({
    content:
      `店舗「${storeName}」の閲覧役職を設定しました。\n` +
      `選択された役職ID: ${selectedRoleIds.join(', ')}`,
    components: [],
  });

  // 設定ログ
  try {
    const description = [`👁️ 店舗「${storeName}」の閲覧役職が更新されました`];
    if (selectedRoleIds.length > 0) {
      for (const roleId of selectedRoleIds) {
        description.push(`➕ 追加: <@&${roleId}>`);
      }
    } else {
      description.push('➖ なし');
    }

    await sendSettingLog(interaction, {
      title: '👁️ 役職ロール紐づけ変更',
      description: description.join('\n'),
      color: 0x9b59b6,
    });
  } catch (err) {
    logger.error('[reportPanelRolesFlow] 閲覧役職ログ出力エラー:', err);
  }

  // TODO: 売上報告パネル embed の「閲覧役職」フィールドを message.edit で更新
}

/**
 * 申請役職ボタン押下
 */
async function handleRequestRoleButton(interaction) {
  const guildId = interaction.guild.id;
  const storeName = interaction.customId.replace('URIAGE_REQUEST_ROLE__', '');

  const roleOptions = await buildRoleSelectOptions(guildId);
  if (roleOptions.length === 0) {
    await interaction.reply({
      content: '役職設定が見つかりません。',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId(`URIAGE_SELECT_REQUEST_ROLES__${storeName}`)
    .setPlaceholder(`店舗「${storeName}」の申請役職を選択してください（複数選択可）`)
    .setMinValues(1)
    .setMaxValues(Math.min(roleOptions.length, 10))
    .addOptions(roleOptions);

  const row = new ActionRowBuilder().addComponents(select);

  await interaction.reply({
    content: `店舗「${storeName}」の売上報告を申請できる役職を選択してください。`,
    components: [row],
    flags: MessageFlags.Ephemeral,
  });
}

/**
 * 申請役職セレクト
 */
async function handleRequestRolesSelect(interaction) {
  const guildId = interaction.guild.id;
  const user = interaction.user;
  const storeName = interaction.customId.replace('URIAGE_SELECT_REQUEST_ROLES__', '');
  const selectedRoleIds = interaction.values;

  const setting = await loadUriageSetting(guildId);
  const panel = getOrCreatePanel(setting, storeName, interaction.message.channel.id);
  panel.requestRoles = selectedRoleIds;

  await saveUriageSetting(guildId, setting);

  await interaction.update({
    content:
      `店舗「${storeName}」の申請役職を設定しました。\n` +
      `選択された役職ID: ${selectedRoleIds.join(', ')}`,
    components: [],
  });

  // 設定ログ
  try {
    const description = [`📝 店舗「${storeName}」の申請役職が更新されました`];
    if (selectedRoleIds.length > 0) {
      for (const roleId of selectedRoleIds) {
        description.push(`➕ 追加: <@&${roleId}>`);
      }
    } else {
      description.push('➖ なし');
    }

    await sendSettingLog(interaction, {
      title: '📝 役職ロール紐づけ変更',
      description: description.join('\n'),
      color: 0x1abc9c,
    });
  } catch (err) {
    logger.error('[reportPanelRolesFlow] 申請役職ログ出力エラー:', err);
  }

  // TODO: 売上報告パネル embed の「申請役職」フィールドを message.edit で更新
}

module.exports = {
  handleViewRoleButton,
  handleViewRolesSelect,
  handleRequestRoleButton,
  handleRequestRolesSelect,
};