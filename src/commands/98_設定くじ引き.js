// src/commands/設定くじ引き.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { upsertKuzibikiPanel } = require('../handlers/kuzibiki/kuzibikiPanel.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('設定くじ引き')
    .setDescription('くじ引き設定パネルをこのチャンネルに設置/更新します')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await upsertKuzibikiPanel(interaction.channel);
    await interaction.reply({ content: '✅ くじ引き設定パネルを設置/更新しました。', ephemeral: true });
  },
};
