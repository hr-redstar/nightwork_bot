// @ts-check
/**
 * src/modules/syut/handlers/PunchHandler.js
 * 打刻処理ハンドラー (Platinum Standard)
 */

const { MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const BaseInteractionHandler = require('../../../structures/BaseInteractionHandler');
const service = require('../SyutService');
const repo = require('../SyutRepository');
const { buildPunchPanel } = require('../ui/panel');
const logger = require('../../../utils/logger');

class PunchHandler extends BaseInteractionHandler {
    /**
     * 打刻実行
     */
    async handlePunch(interaction) {
        const [, , action, type, storeName] = interaction.customId.split(':');

        // 🔆 出勤(in) / 🌙 退勤(out)
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const { timeStr } = await service.processPunch(
                interaction.guildId,
                storeName,
                interaction.user.id,
                interaction.member.displayName,
                type,
                action
            );

            // パネルを更新
            await this.refreshPanel(interaction, storeName, type);

            await interaction.editReply({
                content: `✅ **${action === 'in' ? '出勤' : '退勤'}** を記録しました。\n時刻: **${timeStr}**\n本日も頑張りましょう！✨`
            });
        } catch (err) {
            logger.error('[SyutPunch] Error:', err);
            await interaction.editReply({ content: '❌ 打刻処理中にエラーが発生しました。' });
        }
    }

    /**
     * パネル情報の強制更新
     */
    async handleRefresh(interaction) {
        const [, , , type, storeName] = interaction.customId.split(':');
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        await this.refreshPanel(interaction, storeName, type);

        await interaction.editReply({ content: '✅ パネル情報を最新に更新しました。' });
    }

    /**
     * パネル更新ロジック
     */
    async refreshPanel(interaction, storeName, type) {
        const guildId = interaction.guildId;
        const config = await repo.getGlobalConfig(guildId);
        const panelList = type === 'cast' ? config.castPanelList : config.kurofukuPanelList;
        const panelInfo = panelList?.[storeName];

        if (!panelInfo?.channelId || !panelInfo?.messageId) return;

        try {
            const payload = await buildPunchPanel(guildId, storeName, type);
            const channel = await interaction.guild.channels.fetch(panelInfo.channelId);
            if (channel?.isTextBased()) {
                const message = await channel.messages.fetch(panelInfo.messageId);
                if (message) await message.edit(payload);
            }
        } catch (err) {
            logger.warn(`[Syut] Panel refresh failed for ${storeName} (${type})`, err);
        }
    }

    /**
     * 手入力打刻 (TODO: Modal Implementation)
     */
    async handleManual(interaction) {
        // 今後の拡張で実装
        await interaction.reply({ content: '手入力機能は現在準備中です。', flags: MessageFlags.Ephemeral });
    }
}

module.exports = new PunchHandler();
