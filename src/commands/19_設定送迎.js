const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const BaseCommand = require('../structures/BaseCommand');
const { postSougeiSettingPanel } = require('../modules/sougei/ui/panel');

class SougeiSettingCommand extends BaseCommand {
    constructor() {
        super({ flags: MessageFlags.Ephemeral, defer: true });
        this.data = new SlashCommandBuilder()
            .setName('設定送迎')
            .setDescription('送迎管理機能の設定パネルを表示します')
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);
    }

    async run(interaction) {
        await postSougeiSettingPanel(interaction);
    }
}

module.exports = new SougeiSettingCommand();
