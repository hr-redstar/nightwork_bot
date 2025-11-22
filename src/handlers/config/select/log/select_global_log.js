const {
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
  MessageFlags,
} = require('discord.js');

const { getGuildConfig, saveGuildConfig } = require('../../../../utils/config/gcsConfigManager');
const { sendSettingLog } = require('../../configLogger');
const { sendConfigPanel } = require('../../configPanel');

module.exports = {
  customId: 'CONFIG_SELECT_GLOBAL_LOG',

  async show(interaction) {
    const menu = new ChannelSelectMenuBuilder()
      .setCustomId('CONFIG_SELECT_GLOBAL_LOG_VALUE')
      .setPlaceholder('グローバルログの送信先を選択')
      .addChannelTypes(ChannelType.GuildText);

    const row = new ActionRowBuilder().addComponents(menu);

    await interaction.reply({
      content: '🌍 グローバルログの送信先チャンネルを選択してください。',
      flags: MessageFlags.Ephemeral,
      components: [row],
    });
  },

  async handle(interaction) {
    const target = interaction.values[0]; // チャンネルID
    const guildId = interaction.guild.id;

    const config = await getGuildConfig(guildId);
    const before = config.globalLogChannel;

    config.globalLogChannel = target;
    await saveGuildConfig(guildId, config);

    const logMsg =
      `🌍 **グローバルログチャンネル変更**\n` +
      `旧：${before ? `<#${before}>` : '未設定'}\n` +
      `新：<#${target}>`;

    await sendSettingLog(interaction.guild, {
      user: interaction.user,
      message: logMsg,
      type: 'グローバルログ設定',
    });

    await interaction.update({
      content: '✅ グローバルログチャンネルを保存しました。',
      components: [],
    });

    await sendConfigPanel(interaction.channel);
  },
};
