// src/handlers/config/components/modal/slack/modal_slack_webhook.js

const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  MessageFlags,
} = require('discord.js');

const { getGuildConfig, saveGuildConfig } = require('../../../../../utils/config/gcsConfigManager');
const { sendSettingLog } = require('../../../configLogger');
const { sendAdminLog } = require('../../../configLogger');
const { sendConfigPanel } = require('../../../configPanel');

module.exports = {
  customId: 'CONFIG_SLACK_WEBHOOK_MODAL',

  async show(interaction) {
    const guildId = interaction.guild.id;
    const config = await getGuildConfig(guildId);

    const modal = new ModalBuilder()
      .setCustomId('CONFIG_SLACK_WEBHOOK_MODAL_SUBMIT')
      .setTitle('🤖 Slack Webhook 設定');

    const input = new TextInputBuilder()
      .setCustomId('slack_webhook_url')
      .setLabel('Slack Webhook URL')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setPlaceholder('https://hooks.slack.com/services/xxxx')
      .setValue(config.slackWebhookUrl || '');

    modal.addComponents(new ActionRowBuilder().addComponents(input));

    return interaction.showModal(modal);
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
