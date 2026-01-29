/**
 * src/modules/chat_gpt/setting/settingActions.js
 * ChatGPT設定のボタン/メニュー操作を振り分け
 */

const { sendChatGptSettingPanel } = require('./sendChatGptSettingPanel');
const logger = require('../../../utils/logger');

async function handleSettingAction(interaction, action, subAction) {
    try {
        // パネル再表示
        if (action === 'panel' && subAction === 'refresh') {
            return await sendChatGptSettingPanel(interaction);
        }

        // その他（現在は準備中メッセージなど）
        await interaction.reply({
            content: `🤖 ChatGPT内アクション「${action}:${subAction || ''}」は現在開発中です。`,
            flags: 64
        });
    } catch (err) {
        logger.error('[ChatGPT] handleSettingAction error:', err);
    }
}

module.exports = { handleSettingAction };
