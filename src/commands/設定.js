﻿// src/commands/設定.js
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { postConfigPanel } = require('../handlers/config/configPanel');
const { getGuildConfig } = require('../utils/config/gcsConfigManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('設定')
    .setDescription('設定パネルを設置します（管理者専用）')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {
      const guildId = interaction.guild.id;
      const channel = interaction.channel;

      // GCSから現在の設定を取得
      const config = await getGuildConfig(guildId);

      if (!config) {
        await interaction.reply({
          content: '⚠️ 設定ファイルが存在しません。初期化を行います。',
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.reply({
          content: '✅ 設定パネルを設置しました。',
          flags: MessageFlags.Ephemeral,
        });
      }

      // 設定パネルを投稿（既存メッセージがあれば更新予定）
      await postConfigPanel(channel);
    } catch (err) {
      console.error('❌ /設定 コマンド実行エラー:', err);
      if (!interaction.replied) {
        await interaction.reply({
          content: '❌ 設定パネル設置中にエラーが発生しました。',
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  },
};
