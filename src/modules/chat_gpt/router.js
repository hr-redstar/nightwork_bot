/**
 * src/modules/chat_gpt/router.js
 * ChatGPT機能のインタラクションルーティング
 */

const InteractionRouter = require('../../structures/InteractionRouter');

// Handlers
const { handleSettingAction } = require('./setting/settingActions');
const { handleInteraction } = require('./execute/handler');

const router = new InteractionRouter();

// --- 管理設定系 (chat_gpt:*) ---
router.on(id => id.startsWith('chat_gpt:'), (i) => {
    const parts = i.customId.split(':');
    const action = parts[1];
    const subAction = parts[2];
    return handleSettingAction(i, action, subAction);
});

// --- 実行系 (chatgpt_*) ---
router.on(id => id.startsWith('chatgpt_'), handleInteraction);

module.exports = router;
