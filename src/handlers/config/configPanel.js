// src/handlers/config/configPanel.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { getGuildConfig } = require('../../utils/config/gcsConfigManager');
const { loadStoreRoleConfig } = require('../../utils/config/storeRoleConfigManager');

/**
 * 設定パネルを設置または更新
 * @param {TextChannel} channel - 設置対象チャンネル
 */
async function postConfigPanel(channel) {
  const guildId = channel.guild.id;
  const config = await getGuildConfig(guildId) || {};
  const storeRoleConfig = await loadStoreRoleConfig(guildId);

  // 各設定値のテキストを整形
  const globalLog = config.globalLogChannel ? `<#${config.globalLogChannel}>` : '未設定';
  const adminLog = config.adminLogChannel ? `<#${config.adminLogChannel}>` : '未設定';
  const commandLog = config.commandLogThread ? `<#${config.commandLogThread}>` : '未設定';
  const settingLog = config.settingLogThread ? `<#${config.settingLogThread}>` : '未設定';

  const storesList = storeRoleConfig.stores && storeRoleConfig.stores.length > 0 ? storeRoleConfig.stores.join('\n') : '未登録';
  const rolesList = storeRoleConfig.roles?.length ? storeRoleConfig.roles.join('\n') : '未登録';

  const storeRoleMap = storeRoleConfig.link_store_role && Object.keys(storeRoleConfig.link_store_role).length
    ? Object.entries(storeRoleConfig.link_store_role)
        .map(([store, roleIds]) => `**${store}**\n${roleIds.map(id => `<@&${id}>`).join('\n')}`)
        .join('\n')
    : '未設定';

  const positionRoleMap = storeRoleConfig.link_role_role && Object.keys(storeRoleConfig.link_role_role).length
    ? Object.entries(storeRoleConfig.link_role_role)
        .map(([position, roleIds]) => `**${position}**\n${roleIds.map(id => `<@&${id}>`).join('\n')}`)
        .join('\n')
    : '未設定';

  const slackStatus = config.slackAutomation ? '✅ 有効' : '❌ 無効';

  // Embed構築
  const embed = new EmbedBuilder()
    .setTitle('⚙️ 設定パネル')
    .setColor(0x3498db)
    .setDescription(
      `**🏪 登録済み店舗一覧**\n${storesList}\n\n` +
      `**👥 登録済み役職一覧**\n${rolesList}\n\n` +
      `**🏢 店舗とロールの紐づけ一覧**\n${storeRoleMap}\n\n` +
      `**👔 役職とロールの紐づけ一覧**\n${positionRoleMap}\n\n` +
      '---\n\n' +
      `**​グローバルログチャンネル**\n${globalLog}\n\n` +
      `**管理者ログチャンネル**\n${adminLog}\n\n` +
      `**コマンドログスレッド**\n${commandLog}\n\n` +
      `**設定ログスレッド**\n${settingLog}\n\n` +
      '---\n\n' +
      `**🤖 Slack通知自動化**\n${slackStatus}`
    )
    .setTimestamp();

  // === ボタン構成 ===
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('config_store_edit')
      .setLabel('店舗名編集')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('config_role_edit')
      .setLabel('役職編集')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('config_store_role_link')
      .setLabel('店舗とロールの紐づけ')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('config_position_role_link')
      .setLabel('役職とロールの紐づけ')
      .setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('config_user_register')
      .setLabel('ユーザー情報登録')
      .setStyle(ButtonStyle.Success)
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('config_global_log')
      .setLabel('グローバルログ設定')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('config_admin_log')
      .setLabel('管理者ログ設定')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('config_command_thread')
      .setLabel('コマンドログスレッド設定')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('config_setting_thread')
      .setLabel('設定ログスレッド設定')
      .setStyle(ButtonStyle.Secondary)
  );

  const row4 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('config_slack_auto')
      .setLabel('Slack通知自動化')
      .setStyle(ButtonStyle.Primary)
  );

  // === 既存メッセージを検索して更新 ===
  const messages = await channel.messages.fetch({ limit: 10 });
  const existing = messages.find((m) =>
    m.embeds[0]?.title?.includes('設定パネル')
  );

  if (existing) {
    await existing.edit({
      embeds: [embed],
      components: [row1, row2, row3, row4],
    });
    console.log('♻️ 設定パネルを更新しました');
  } else {
    await channel.send({
      embeds: [embed],
      components: [row1, row2, row3, row4],
    });
    console.log('✅ 設定パネルを新規設置しました');
  }
}

module.exports = { postConfigPanel };
