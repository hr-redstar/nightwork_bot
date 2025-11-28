﻿// src/commands/11_設定経費.js

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');

const { sendCommandLog } = require('../utils/config/configLogger');
const { postKeihiSettingPanel } = require('../handlers/keihi/setting/panel');

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
      // ✅ ここを ephemeral: true から flags に変更
      await interaction.deferReply({
        flags: MessageFlags.Ephemeral,
      });

      // コマンドログ出力（別チャンネルなので公開でOK）
      await sendCommandLog(interaction);

      // 設定パネル送信 or 更新（公開メッセージはここで扱う）
      await postKeihiSettingPanel(interaction);
    } catch (err) {
      console.error('[/設定経費] エラー:', err);

      if (interaction.deferred) {
        // 既に defer 済みなので editReply（flags は不要）
        await interaction.editReply({
          content: '⚠️ 経費設定パネルの表示中にエラーが発生しました。',
        });
      } else if (!interaction.replied) {
        // まだ何も返していない場合はこちら
        await interaction.reply({
          content: '⚠️ 経費設定パネルの表示中にエラーが発生しました。',
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  },
};
