const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const BaseCommand = require('../structures/BaseCommand');
const appRouter = require('../structures/AppRouter');

class WelcomeSettingCommand extends BaseCommand {
    constructor() {
        super({ ephemeral: false, defer: true });
        this.data = new SlashCommandBuilder()
            .setName('設定ようこそ')
            .setDescription('ようこそ機能の設定パネルを表示します')
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
    }

    async run(interaction) {
        // ボタンクリックを擬似的に発生させて AppRouter に配送
        interaction.customId = 'welcome:panel:refresh';
        return await appRouter.dispatch(interaction);
    }
}

module.exports = new WelcomeSettingCommand();
