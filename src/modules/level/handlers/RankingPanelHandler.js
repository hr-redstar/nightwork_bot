/**
 * src/modules/level/handlers/RankingPanelHandler.js
 */

const BaseInteractionHandler = require('../../../structures/BaseInteractionHandler');
const { MessageFlags } = require('discord.js');

class RankingPanelHandler extends BaseInteractionHandler {
    async handle(interaction) {
        // 現在は準備中
        await this.safeReply(interaction, {
            content: '📊 レベルランキング機能は現在準備中です。今後のアップデートをお楽しみに！',
            flags: MessageFlags.Ephemeral
        });
    }
}

module.exports = new RankingPanelHandler();
