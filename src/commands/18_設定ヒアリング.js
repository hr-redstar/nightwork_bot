const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const BaseCommand = require('../structures/BaseCommand');
const { postHearingSettingPanel } = require('../modules/hearing_log/ui/panel');

class HearingSettingCommand extends BaseCommand {
    constructor() {
        super({ flags: MessageFlags.Ephemeral, defer: true });
        this.data = new SlashCommandBuilder()
            .setName('設定ヒアリング')
            .setDescription('ヒアリング報告機能の設定パネルを表示します')
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);
    }

    async run(interaction) {
        await postHearingSettingPanel(interaction);
    }
}

module.exports = new HearingSettingCommand();
