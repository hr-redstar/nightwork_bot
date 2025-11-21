﻿// src/commands/11_設定経費.js

const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { postKeihiSettingPanel } = require("../handlers/keihi/keihiPanel_Setting");
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
      // コマンドログ
      await sendCommandLog(interaction);

      // 設定パネルを送信（エフェメラル）
      await postKeihiSettingPanel(interaction);

    } catch (err) {
      console.error("[/設定経費] エラー:", err);
      return interaction.reply({
        content: "⚠️ 経費設定パネルの表示中にエラーが発生しました。",
        ephemeral: true,
      });
    }
  },
};
