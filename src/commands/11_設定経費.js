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
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      // コマンドの応答を保留し、タイムアウトを防ぐ
      await interaction.deferReply({ ephemeral: true });

      await postKeihiPanel(interaction.channel);

      // コマンドログ出力
      await sendCommandLog(interaction);

      // 実行結果を本人にだけ通知
      const reply = await interaction.editReply({ content: '✅ 経費設定パネルを設置または更新しました。' });

      // 30秒後にメッセージを自動削除
      setTimeout(() => {
        reply.delete().catch(err => console.error('Failed to delete ephemeral reply:', err));
      }, 30000);
    } catch (err) {
      console.error('❌ /設定経費 コマンドエラー:', err);
      // deferReply済みなので editReply でエラーを返す
      await interaction.editReply({
        content: '⚠️ パネルの設置中にエラーが発生しました。',
      }).catch(() => {}); // editReplyが失敗してもクラッシュしないようにする
    }
  },
};