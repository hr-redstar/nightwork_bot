// src/commands/設定経費.js
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { sendConfigPanel } = require('../handlers/keihi/keihiPanel_Config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('設定経費')
    .setDescription('このチャンネルに経費設定パネルを設置します')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {
      const targetChannel = interaction.channel;

      await sendConfigPanel(targetChannel, interaction.guildId);

      await interaction.reply({
        content: `✅ 経費設定パネルを <#${targetChannel.id}> に設置しました。`,
        flags: MessageFlags.Ephemeral,
      });
    } catch (err) {
      console.error('❌ /設定経費 実行エラー:', err);
      await interaction.reply({
        content: '⚠️ 経費設定パネルの設置中にエラーが発生しました。',
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
