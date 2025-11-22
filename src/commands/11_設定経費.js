﻿// src/commands/11_設定経費.js

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");
const { postKeihiSettingPanel } = require("../handlers/keihi/setting/keihiPanel_Setting");
const { sendCommandLog } = require("../handlers/config/configLogger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("設定経費")
    .setDescription("経費設定パネルを開きます。（管理者のみ）")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    // 管理者チェック
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: "⚠️ このコマンドは管理者のみ実行できます。",
        ephemeral: true,
      });
    }

    try {
      // 応答を保留し、後続処理で失敗してもエラーを返せるようにする
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      // 設定パネルをチャンネルに送信（公開）
      await postKeihiSettingPanel(interaction);

      // コマンドログを送信
      await sendCommandLog(interaction);

      // 成功を通知
      await interaction.editReply('✅ 経費設定パネルを送信・更新しました。');
    } catch (err) {
      console.error("[/設定経費] エラー:", err);
      await interaction.editReply('⚠️ 経費設定パネルの処理中にエラーが発生しました。').catch(() => {});
    }
  },
};
