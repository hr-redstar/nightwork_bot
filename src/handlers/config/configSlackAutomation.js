// src/handlers/config/configSlackAutomation.js
const { getGuildConfig, setGuildConfig } = require('../../utils/config/gcsConfigManager');
const { MessageFlags } = require('discord.js');
const { sendSettingLog } = require('./configLogger');
const { postConfigPanel } = require('./configPanel');

/**
 * Slack通知自動化設定をトグル切り替え
 */
async function toggleSlackAutomation(interaction) {
  try {
    const guildId = interaction.guild.id;
    const config = (await getGuildConfig(guildId)) || {};

    // 現在の設定を反転
    const newStatus = !config.slackAutomation;
    config.slackAutomation = newStatus;

    await setGuildConfig(guildId, config);

    const msg = newStatus
      ? '✅ Slack通知自動化を **有効化** しました。'
      : '❌ Slack通知自動化を **無効化** しました。';

    await sendSettingLog(interaction.guild, {
      user: interaction.user,
      message: `🔁 Slack通知自動化の設定が変更されました。\n現在の状態: ${
        newStatus ? '✅ 有効' : '❌ 無効'
      }`,
      type: 'Slack自動化設定変更',
    });

    await interaction.reply({
      content: msg,
      flags: MessageFlags.Ephemeral,
    });

    // パネルを更新
    await postConfigPanel(interaction.channel);
  } catch (err) {
    console.error('❌ Slack自動化トグルエラー:', err);
    await interaction.reply({
      content: '⚠️ Slack通知自動化の切り替えに失敗しました。',
      flags: MessageFlags.Ephemeral,
    });
  }
}

module.exports = { toggleSlackAutomation };
