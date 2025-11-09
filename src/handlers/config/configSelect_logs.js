// src/handlers/config/configSelect_logs.js
const {
  ChannelType,
  MessageFlags,
  ChannelSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
} = require('discord.js');
const { getGuildConfig, setGuildConfig } = require('../../utils/config/gcsConfigManager');
const { sendSettingLog } = require('./configLogger');
const { postConfigPanel } = require('./configPanel');

/**
 * ログ設定ボタンのインタラクションを処理するエントリーポイント
 * @param {import('discord.js').ButtonInteraction} interaction
 */
async function handleLogButtons(interaction) {
  const customId = interaction.customId;
  if (customId === 'config_global_log') {
    await showLogChannelSelect(interaction, 'global');
  } else if (customId === 'config_admin_log') {
    await showLogChannelSelect(interaction, 'admin');
  } else if (customId === 'config_command_thread') {
    await createLogThread(interaction, 'command');
  } else if (customId === 'config_setting_thread') {
    await createLogThread(interaction, 'setting');
  }
}

/**
 * グローバル・管理者ログ用チャンネル選択メニューを表示
 */
async function showLogChannelSelect(interaction, type) {
  const select = new ChannelSelectMenuBuilder()
    .setCustomId(`select_${type}_log_channel`)
    .setPlaceholder('チャンネルを選択')
    .addChannelTypes(ChannelType.GuildText);

  const row = new ActionRowBuilder().addComponents(select);  
  const title =
    type === 'global'
      ? '🌐 グローバルログチャンネル設定'
      : '🛡️ 管理者ログチャンネル設定';

  await interaction.reply({
    content: `${title}\nログを出力するチャンネルを選択してください。`,
    components: [row],
    flags: MessageFlags.Ephemeral,
  });
  return;
}

/**
 * チャンネル選択後、設定保存
 */
async function handleLogChannelSelect(interaction, type) {
  const guildId = interaction.guild.id;
  const selectedChannel = interaction.values[0];
  const config = (await getGuildConfig(guildId)) || {};

  if (type === 'global') config.globalLogChannel = selectedChannel;
  if (type === 'admin') config.adminLogChannel = selectedChannel;

  await setGuildConfig(guildId, config);

  const logMsg = `${
    type === 'global' ? '🌐 グローバルログ' : '🛡️ 管理者ログ'
  } チャンネルが更新されました。\n<#${selectedChannel}>`;

  await sendSettingLog(interaction.guild, {
    user: interaction.user,
    message: logMsg,
    type: 'ログチャンネル設定',
  });

  try {
    await interaction.update({
      content: `✅ ログチャンネルを <#${selectedChannel}> に設定しました。`,
      components: [],
    });
  } catch (updateErr) {
    logger.error('❌ handleLogChannelSelect: interaction.update エラー:', updateErr);
    // updateが失敗した場合、Discordは既にインタラクション失敗と判断している可能性が高い
    // ここで再度reply/followUpを試みると「すでに返信済み」エラーになることが多い
    // エラーログを残し、処理を終了する
    if (!interaction.replied && !interaction.deferred) {
      await interaction.followUp({ // replyではなくfollowUpを使用
        content: `❌ ログチャンネル設定の更新中にエラーが発生しました。\nエラー詳細: \`${updateErr.message}\``,
        flags: MessageFlags.Ephemeral,
      }).catch(e => logger.error('❌ followUp エラー:', e)); // followUpも失敗する可能性があるのでcatch
    } else if (interaction.deferred) {
      await interaction.followUp({ // deferred状態ならfollowUp
        content: `❌ ログチャンネル設定の更新中にエラーが発生しました。\nエラー詳細: \`${updateErr.message}\``,
        flags: MessageFlags.Ephemeral,
      }).catch(e => logger.error('❌ followUp エラー:', e));
    }
    return; // updateが失敗したら、それ以上処理を続行しない
  }

  try {
    await postConfigPanel(interaction.channel);
  } catch (panelErr) {
    logger.error('❌ handleLogChannelSelect: postConfigPanel エラー:', panelErr);
    // パネル更新は失敗したが、インタラクション自体はupdateで応答済み
  }
  return;
}
/**
 * コマンドログスレッド・設定ログスレッド作成
 */
async function createLogThread(interaction, type) {
  const threadName =
    type === 'command'
      ? '💬 コマンドログスレッド'
      : '⚙️ 設定ログスレッド';

  // スレッドを現在のチャンネルで作成
  const thread = await interaction.channel.threads.create({
    name: threadName,
    autoArchiveDuration: 10080, // 7日
    reason: `${type}ログ用スレッド作成`,
  });

  const guildId = interaction.guild.id;
  const config = (await getGuildConfig(guildId)) || {};

  if (type === 'command') config.commandLogThread = thread.id;
  if (type === 'setting') config.settingLogThread = thread.id;

  await setGuildConfig(guildId, config);

  const logMsg = `🧵 **${threadName}** が作成されました。\nスレッド: <#${thread.id}>`;

  await sendSettingLog(interaction.guild, {
    user: interaction.user,
    message: logMsg,
    type: 'スレッド作成',
  });

  await interaction.reply({
    content: `✅ ${threadName} を作成しました。`,
    flags: MessageFlags.Ephemeral,
  });

  await postConfigPanel(interaction.channel);
}

module.exports = {
  handleLogButtons,
  showLogChannelSelect,
  handleLogChannelSelect,
  createLogThread,
};
