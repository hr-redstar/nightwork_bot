const { MessageFlags } = require('discord.js');
const { getGuildConfig, saveGuildConfig } = require('../../../../../utils/config/gcsConfigManager');
const { sendSettingLog } = require('../../../configLogger');
const { sendConfigPanel } = require('../../../configPanel');

module.exports = {
  customId: 'CONFIG_CREATE_SETTING_THREAD',

  async handle(interaction) {
    const channel = interaction.channel;

    const thread = await channel.threads.create({
      name: '⚙️ 設定ログ',
      autoArchiveDuration: 10080,
    });

    const guildId = interaction.guild.id;
    const config = await getGuildConfig(guildId);
    const before = config.settingLogThread;

    config.settingLogThread = thread.id;
    await saveGuildConfig(guildId, config);

    const logMsg =
      `⚙️ **設定ログスレッド作成**\n` +
      `新：<#${thread.id}>\n` +
      `旧：${before ? `<#${before}>` : '未設定'}`;

    await sendSettingLog(interaction.guild, {
      user: interaction.user,
      message: logMsg,
      type: '設定ログスレッド設定',
    });

    await interaction.reply({
      content: '⚙️ 設定ログスレッドを作成しました。',
      flags: MessageFlags.Ephemeral,
    });

    await sendConfigPanel(channel);
  },
};
