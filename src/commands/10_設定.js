﻿// src/commands/設定.js

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { sendConfigPanel } = require('../handlers/config/configPanel');
const { getGuildConfig } = require('../utils/config/gcsConfigManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('設定')
    .setDescription('設定パネルを設置します（管理者専用）')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {
      const channel = interaction.channel;

      // 先に応答を保留
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      // 設定パネルを投稿（既存メッセージがあれば更新予定）
      await sendConfigPanel(channel);

      // 処理完了後の応答は不要なため削除
      await interaction.deleteReply();
    } catch (err) {
      console.error('❌ /設定 コマンド実行エラー:', err);
      // deferReply後なのでeditReplyでエラーメッセージを送信
      await interaction.editReply({ content: '❌ 設定パネル設置中にエラーが発生しました。' }).catch(() => {});
    }
  },
};
