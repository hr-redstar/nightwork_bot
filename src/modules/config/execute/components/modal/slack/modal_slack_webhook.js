// src/handlers/config/components/modal/slack/modal_slack_webhook.js

const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  MessageFlags,
} = require('discord.js');

const { getGuildConfig, saveGuildConfig } = require('../../../../../../utils/config/gcsConfigManager');
const { sendSettingLog } = require('../../../../../../utils/config/configLogger');
const { sendAdminLog } = require('../../../../../../utils/config/configLogger');
const { sendConfigPanel } = require('../../../configPanel');
const showModalSafe = require('../../../../../../utils/showModalSafe');

module.exports = {
  customId: 'config_slack_webhook_modal',

  async show(interaction) {
    // 💡 Platinum Rule: showModal は即座に呼ぶ（3秒ルール厳守）
    const modal = new ModalBuilder()
      .setCustomId('config_slack_webhook_modal_submit')
      .setTitle('🤖 Slack Webhook 設定');

    const input = new TextInputBuilder()
      .setCustomId('slack_webhook_url')
      .setLabel('Slack Webhook URL')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setPlaceholder('https://hooks.slack.com/services/xxxx');

    modal.addComponents(new ActionRowBuilder().addComponents(input));

    return showModalSafe(interaction, modal);
  },

  async handle(interaction) {
    const guildId = interaction.guild.id;
    const url = interaction.fields.getTextInputValue('slack_webhook_url');

    const config = await getGuildConfig(guildId);
    const before = config.slackWebhookUrl;

    config.slackWebhookUrl = url;
    await saveGuildConfig(guildId, config);

    const logMsg =
      `🤖 **Slack Webhook URL が変更されました**\n` +
      `旧：${before || '未設定'}\n新：${url}`;

    // 設定ログ
    await sendSettingLog(interaction.guild, {
      user: interaction.user,
      message: logMsg,
      type: 'Slack通知設定',
    });

    // 管理者ログ
    await sendAdminLog(interaction.guild, {
      user: interaction.user,
      message: logMsg,
      type: 'Slack通知設定',
    });

    await interaction.reply({
      content: '✅ Slack Webhook URL を保存しました。',
      flags: MessageFlags.Ephemeral,
    });

    await sendConfigPanel(interaction.channel);
  },
};
