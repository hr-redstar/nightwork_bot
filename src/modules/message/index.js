// modules/message/index.js
// ----------------------------------------------------
// メッセージ操作機能のエントリーポイント
// ----------------------------------------------------

const logger = require('../../utils/logger');

/**
 * メッセージ操作機能のインタラクションハンドラー
 * @param {import('discord.js').Interaction} interaction
 */
async function handleMessageInteraction(interaction) {
    // 現状、メッセージファイル化はSlashCommandから直接呼ばれるが、
    // 他のボタン等が必要になった際はこちらに集約する
    try {
        // placeholder
    } catch (err) {
        logger.error('[Message] Error handling interaction', err);
    }
}

module.exports = {
    // AppRouter Metadata
    prefixes: ['message'],
    handleInteraction: handleMessageInteraction,

    // Legacy
    handleMessageInteraction,
};
