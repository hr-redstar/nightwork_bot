// src/commands/設定くじ引き.js
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { upsertKuzibikiPanel } = require('../handlers/kuzibiki/kuzibikiPanel.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('設定くじ引き')
    .setDescription('くじ引き設定パネルをこのチャンネルに設置/更新します')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      await upsertKuzibikiPanel(interaction.channel);
      await interaction.editReply({ content: '✅ くじ引き設定パネルを設置/更新しました。' });
    } catch (err) {
      console.error('[/設定くじ引き] エラー:', err);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: '⚠️ くじ引き設定パネルの設置中にエラーが発生しました。' });
      } else {
        await interaction.reply({ content: '⚠️ くじ引き設定パネルの設置中にエラーが発生しました。', flags: MessageFlags.Ephemeral });
      }
    }
  },
};
