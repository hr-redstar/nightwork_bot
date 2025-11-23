﻿﻿﻿// src/commands/11_設定経費.js

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");
const { postKeihiSettingPanel } = require("../handlers/keihi/setting/keihiPanel_Setting");
const { sendCommandLog } = require("../handlers/config/configLogger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("設定経費")
    .setDescription("経費設定パネルを開きます。（管理者のみ）")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: "⚠️ このコマンドは管理者のみ実行できます。",
        flags: [MessageFlags.Ephemeral],
      });
    }

    try {
      // コマンドログ出力
      await sendCommandLog(interaction);

      // 設定パネル送信 or 更新
      await postKeihiSettingPanel(interaction);
    } catch (err) {
      console.error("[/設定経費] エラー:", err);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "⚠️ 経費設定パネルの表示中にエラーが発生しました。",
          flags: [MessageFlags.Ephemeral],
        });
      }
    }
  },
};
