// src/commands/11_設定経費.js

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { postKeihiPanel } = require('../handlers/keihi/keihiPanel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('設定経費')
    .setDescription('経費関連の設定パネルを設置します。')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: '⚠️ このコマンドは管理者のみが実行できます。',
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      await postKeihiPanel(interaction.channel);
      await interaction.reply({ content: '✅ 経費設定パネルを設置しました。', flags: MessageFlags.Ephemeral });
    } catch (err) {
      console.error('❌ /設定経費 コマンドエラー:', err);
      await interaction.reply({ content: '⚠️ パネルの設置中にエラーが発生しました。', flags: MessageFlags.Ephemeral });
    }
  },
};