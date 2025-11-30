// src/handlers/uriage/setting/approverRolesFlow.js
// ----------------------------------------------------
// /設定売上 パネルの「承認役職」設定フロー
// ----------------------------------------------------

const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder,
} = require('discord.js');

const logger = require('../../../utils/logger');
const { buildRoleSelectOptions } = require('../../../utils/config/roleSelectHelper');
const { loadUriageSetting, saveUriageSetting } = require('../../../utils/uriage/gcsUriageSettingManager');
const { sendSettingLog } = require('../../../utils/config/configLogger');

/**
 * 「承認役職」ボタン押下 → 役職セレクトメニュー表示
 * @param {import('discord.js').ButtonInteraction} interaction
 */
async function handleApproverRolesButton(interaction) {
  const guildId = interaction.guild.id;

  const roleOptions = await buildRoleSelectOptions(guildId);

  if (roleOptions.length === 0) {
    await interaction.reply({
      content:
        '役職設定が見つかりません。\n' +
        '先に `/設定店舗情報` や 役職設定を行ってください。',
      ephemeral: true,
    });
    return;
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId('URIAGE_SELECT_APPROVER_ROLES')
    .setPlaceholder('売上承認を行える役職を選択してください（複数選択可）')
    .setMinValues(1)
    .setMaxValues(Math.min(roleOptions.length, 10))
    .addOptions(roleOptions);

  const row = new ActionRowBuilder().addComponents(select);

  await interaction.reply({
    content: '売上の「承認」を行える役職を選択してください。',
    components: [row],
    ephemeral: true,
  });
}

/**
 * 役職セレクト → 設定保存 & ログ出力
 * @param {import('discord.js').StringSelectMenuInteraction} interaction
 */
async function handleApproverRolesSelect(interaction) {
  const guildId = interaction.guild.id;
  const user = interaction.user;
  const selectedRoleIds = interaction.values; // ["店長", "黒服", ...]

  const setting = await loadUriageSetting(guildId);
  setting.approverRoles = selectedRoleIds;

  await saveUriageSetting(guildId, setting);

  // ユーザーへフィードバック
  await interaction.update({
    content:
      `承認役職を設定しました。\n` +
      `選択された役職ID: ${selectedRoleIds.join(', ')}`,
    components: [],
  });

  // 設定ログ出力
  try {
    const embed = new EmbedBuilder()
      .setTitle('売上 承認役職設定')
      .setDescription('売上報告の承認を行える役職を設定しました。')
      .addFields(
        { name: '承認役職ID', value: selectedRoleIds.join('\n') || '（なし）' },
        { name: '設定者', value: `<@${user.id}>`, inline: true },
        { name: '設定日時', value: new Date().toLocaleString('ja-JP'), inline: true },
      )
      .setColor('#f1c40f');

    await sendSettingLog(guildId, embed);
  } catch (err) {
    logger.error('[approverRolesFlow] 設定ログ出力エラー:', err);
  }

  // TODO: /設定売上 パネルの再描画をここで呼び出してもOK
  // 例: await postUriageSettingPanel(interaction.channel);
}

module.exports = {
  handleApproverRolesButton,
  handleApproverRolesSelect,
};