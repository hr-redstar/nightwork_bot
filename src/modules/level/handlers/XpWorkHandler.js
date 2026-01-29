/**
 * src/modules/level/handlers/XpWorkHandler.js
 */

const BaseInteractionHandler = require('../../../structures/BaseInteractionHandler');

class XpWorkHandler extends BaseInteractionHandler {
    async handle(interaction) {
        await this.safeReply(interaction, {
            content: '💼 出勤時間XP機能は現在準備中です。出退勤モジュールとの連動をお待ちください。',
            flags: MessageFlags.Ephemeral
        });
    }
}

module.exports = new XpWorkHandler();
