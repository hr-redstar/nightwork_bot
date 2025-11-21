const {
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
  MessageFlags,
} = require('discord.js');

const { getGuildConfig, saveGuildConfig } = require('../../../../utils/config/gcsConfigManager');
const { sendSettingLog } = require('../../configLogger');
const { postConfigPanel } = require('../../configPanel');

module.exports = {
  customId: 'CONFIG_SELECT_ADMIN_LOG',

  async show(interaction) {
    const menu = new ChannelSelectMenuBuilder()
      .setCustomId('CONFIG_SELECT_ADMIN_LOG_VALUE')
      .setPlaceholder('管理者ログの送信先を選択')
      .addChannelTypes(ChannelType.GuildText);

    const row = new ActionRowBuilder().addComponents(menu);

    await interaction.reply({
      content: '🛡️ 管理者ログの送信先チャンネルを選択してください。',
      flags: MessageFlags.Ephemeral,
      components: [row],
    });
  },

  async handle(interaction) {
    const target = interaction.values[0];
    const guildId = interaction.guild.id;

    const config = await getGuildConfig(guildId);
    const before = config.adminLogChannel;

    config.adminLogChannel = target;
    await saveGuildConfig(guildId, config);

    const logMsg =
      `🛡️ **管理者ログチャンネル変更**\n` +
      `旧：${before ? `<#${before}>` : '未設定'}\n` +
      `新：<#${target}>`;

    await sendSettingLog(interaction.guild, {
      user: interaction.user,
      message: logMsg,
      type: '管理者ログ設定',
    });

    await interaction.update({
      content: '✅ 管理者ログチャンネルを保存しました。',
      components: [],
    });

    await postConfigPanel(interaction.channel);
  },
};
