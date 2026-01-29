// src/commands/12_設定売上.js
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const BaseCommand = require('../structures/BaseCommand');
const { sendCommandLog } = require('../utils/config/configLogger');
const { postUriageSettingPanel } = require('../modules/uriage/setting/panel');

class UriageSettingCommand extends BaseCommand {
  constructor() {
    super({ ephemeral: false, defer: true });
    this.data = new SlashCommandBuilder()
      .setName('設定売上')
      .setDescription('売上機能に関する設定パネルを表示します')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);
  }

  async run(interaction) {
    await sendCommandLog(interaction);
    await postUriageSettingPanel(interaction);
  }
}

module.exports = new UriageSettingCommand();
