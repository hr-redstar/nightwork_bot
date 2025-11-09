const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { updatePanel } = require('../handlers/kuzibiki/kuzibikiPanel');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('設定くじ引き')
        .setDescription('くじ引き設定パネルを表示します'),
    async execute(interaction) {
        try {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            // kuzibikiPanel.js の updatePanel を呼び出してパネルを送信・更新
            await updatePanel(interaction.channel, interaction.guildId, interaction);
            await interaction.editReply({ content: '✅ くじ引き設定パネルを更新しました。' });
        } catch (err) {
            console.error('❌ /設定くじ引き コマンド実行エラー:', err);
            await interaction.editReply({ content: '⚠️ パネルの表示中にエラーが発生しました。' });
        }
    }
};
