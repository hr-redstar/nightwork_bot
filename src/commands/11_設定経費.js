﻿// src/commands/11_設定経費.js

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const configManager = require('../utils/config/gcsConfigManager');
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
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const guildId = interaction.guildId;
      const channel = interaction.channel;
      const config = await configManager.getGuildConfig(guildId);
      const panelMessageId = config.keihi?.panelMessageId;

      // 既存のパネルメッセージがあれば削除
      if (panelMessageId) {
        try {
          const oldMessage = await channel.messages.fetch(panelMessageId);
          await oldMessage.delete();
        } catch (error) {
          console.warn(`[設定経費] 古いパネルメッセージの削除に失敗しました: ${panelMessageId}`, error.message);
        }
      }

      // 新しいパネルを投稿
      const newPanelMessage = await postKeihiPanel(channel, config);

      // 投稿された最新のメッセージ（パネル）を取得してIDを保存
      const newPanelMessage = await channel.messages.fetch({ limit: 1 });
      config.keihi = { ...config.keihi, panelMessageId: newPanelMessage.first().id };
      await configManager.setGuildConfig(guildId, config);

      // コマンドログ出力
      await sendCommandLog(interaction);

      // 実行結果を本人にだけ通知
      await interaction.editReply({ content: '✅ 経費設定パネルを更新しました。' });
    } catch (err) {
      console.error('❌ /設定経費 コマンドエラー:', err);
      // deferReply済みなので editReply でエラーを返す
      await interaction.editReply({
        content: '⚠️ パネルの設置中にエラーが発生しました。',
      }).catch(() => {}); // editReplyが失敗してもクラッシュしないようにする
    }
  },
};