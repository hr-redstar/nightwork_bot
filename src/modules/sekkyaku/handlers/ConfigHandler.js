// @ts-check
/**
 * src/modules/sekkyaku/handlers/ConfigHandler.js
 * 接客ログ設定ハンドラー (Platinum Standard)
 */

const { ActionRowBuilder, ChannelSelectMenuBuilder, ChannelType, MessageFlags } = require('discord.js');
const BaseInteractionHandler = require('../../../structures/BaseInteractionHandler');
const { postSekkyakuSettingPanel } = require('../ui/panel');
const repo = require('../SekkyakuRepository');

class ConfigHandler extends BaseInteractionHandler {
    /**
     * 出力チャンネル設定メニュー表示
     */
    async showChannelSelect(interaction) {
        const row = new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId('sekkyaku:setting:channel_submit')
                .setPlaceholder('報告ログを出力するチャンネルを選択')
                .addChannelTypes(ChannelType.GuildText)
        );

        await interaction.reply({
            content: '📊 接客ログ（詳細）を出力・保存するチャンネルを選択してください。',
            components: [row],
            flags: MessageFlags.Ephemeral
        });
    }

    /**
     * チャンネル設定保存
     */
    async handleChannelSubmit(interaction) {
        const channelId = interaction.values[0];
        const config = await repo.getConfig(interaction.guildId);
        config.targetChannelId = channelId;
        await repo.saveConfig(interaction.guildId, config);

        await interaction.reply({
            content: `✅ 接客ログの出力先を <#${channelId}> に設定しました。`,
            flags: MessageFlags.Ephemeral
        });

        // 元の設定パネルがあれば更新を試みる
        // (AppRouter経由なら interaction.message があるはず)
    }
}

module.exports = new ConfigHandler();
