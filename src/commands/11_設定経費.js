﻿const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const BaseCommand = require('../structures/BaseCommand');
const { sendCommandLog } = require('../utils/config/configLogger');
const { postKeihiSettingPanel } = require('../modules/keihi/setting/panel');

class KeihiSettingCommand extends BaseCommand {
  constructor() {
    super({ ephemeral: true, defer: true });
    this.data = new SlashCommandBuilder()
      .setName('設定経費')
      .setDescription('経費設定パネルを送信/更新します。')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);
  }

  async run(interaction) {
    await sendCommandLog(interaction);
    await postKeihiSettingPanel(interaction);
  }
}

module.exports = new KeihiSettingCommand();
