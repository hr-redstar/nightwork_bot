﻿// src/commands/11_設定経費.js

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');

const { sendCommandLog } = require('../utils/config/configLogger');
// ★ ここでは panel.js を require しない（循環対策）

module.exports = {
  data: new SlashCommandBuilder()
    .setName('設定経費')
    .setDescription('経費設定パネルを送信/更新します。')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    try {
      // 応答を遅延 (ephemeral)
      await interaction.deferReply({
        flags: MessageFlags.Ephemeral,
      });

      // コマンドログ出力
      await sendCommandLog(interaction);

      // ★ ここで初めて panel.js を読み込む（遅延 require）
      const {
        postKeihiSettingPanel,
      } = require('../handlers/keihi/setting/panel');

      // 設定パネル送信 / 更新
      await postKeihiSettingPanel(interaction);
    } catch (err) {
      console.error('[/設定経費] エラー:', err);

      if (interaction.deferred) {
        await interaction.editReply({
          content: '⚠️ 経費設定パネルの表示中にエラーが発生しました。',
        });
      } else if (!interaction.replied) {
        await interaction.reply({
          content: '⚠️ 経費設定パネルの表示中にエラーが発生しました。',
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  },
};
