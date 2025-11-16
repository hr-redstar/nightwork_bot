﻿// src/commands/11_設定経費.js

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { postKeihiPanel } = require('../handlers/keihi/経費設定/keihiPanel');
const { sendCommandLog } = require('../handlers/config/configLogger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('設定経費')
    .setDescription('経費関連の設定パネルを設置します。')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: '⚠️ このコマンドは管理者のみが実行できます。',
      });
    }

    try {
      // コマンドの応答を保留し、タイムアウトを防ぐ
      await interaction.deferReply(); // ephemeral: false (public) by default

      await postKeihiPanel(interaction.channel);

      // コマンドログ出力
      await sendCommandLog(interaction);

      // 実行結果をチャンネルに通知
      await interaction.editReply({ content: '✅ 経費設定パネルを設置または更新しました。' });
    } catch (err) {
      console.error('❌ /設定経費 コマンドエラー:', err);
      await interaction.editReply({ content: '⚠️ パネルの設置中にエラーが発生しました。' });
    }
  },
};