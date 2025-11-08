const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { updatePanel } = require('../handlers/kuzibiki/kuzibikiPanel');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('設定くじ引き')
        .setDescription('くじ引き設定パネルを表示します'),
    async execute(interaction) {
        try {
            // kuzibikiPanel.js の updatePanel を呼び出してパネルを送信・更新
            await updatePanel(interaction.channel, interaction.guildId, interaction);
            await interaction.reply({ content: '✅ くじ引き設定パネルを更新しました。', flags: MessageFlags.Ephemeral });
        } catch (err) {
            console.error('❌ /設定くじ引き コマンド実行エラー:', err);
            if (!interaction.replied) {
                await interaction.reply({ content: 'パネルの表示中にエラーが発生しました。', flags: MessageFlags.Ephemeral });
            }
        }
    }
};
