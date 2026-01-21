const { MessageFlags } = require('discord.js');
const { getGuildConfig, saveGuildConfig } = require('../../../../../../utils/config/gcsConfigManager');
const { sendSettingLog } = require('../../../../../../utils/config/configLogger');
const { sendConfigPanel } = require('../../../configPanel');

module.exports = {
  customId: 'CONFIG_CREATE_COMMAND_THREAD',

  async handle(interaction) {
    const channel = interaction.channel;

    // スレッド作成
    const thread = await channel.threads.create({
      name: '📝 コマンドログ',
      autoArchiveDuration: 10080, // 1週間
    });

    const guildId = interaction.guild.id;
    const config = await getGuildConfig(guildId);
    const before = config.commandLogThread;

    config.commandLogThread = thread.id;
    await saveGuildConfig(guildId, config);

    const logMsg =
      `📝 **コマンドログスレッド作成**\n` +
      `新：<#${thread.id}>\n` +
      `旧：${before ? `<#${before}>` : '未設定'}`;

    await sendSettingLog(interaction.guild, {
      user: interaction.user,
      message: logMsg,
      type: 'コマンドログスレッド設定',
    });

    await interaction.reply({
      content: '📝 コマンドログスレッドを作成しました。',
      flags: MessageFlags.Ephemeral,
    });

    await sendConfigPanel(channel);
  },
};
