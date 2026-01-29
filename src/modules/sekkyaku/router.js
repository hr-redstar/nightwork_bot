/**
 * src/modules/sekkyaku/router.js
 * 接客ログルーティング (Platinum Edition)
 */

const InteractionRouter = require('../../structures/InteractionRouter');
const configHandler = require('./handlers/ConfigHandler');
const logHandler = require('./handlers/LogHandler');
const { postSekkyakuSettingPanel } = require('./ui/panel');

const router = new InteractionRouter();

// --- 管理設定系 (sekkyaku:setting:*) ---
router.on('sekkyaku:setting:refresh', async (i) => {
    await postSekkyakuSettingPanel(i);
});

router.on('sekkyaku:setting:set_channel', async (i) => {
    await configHandler.showChannelSelect(i);
});

router.on('sekkyaku:setting:channel_submit', async (i) => {
    await configHandler.handleChannelSubmit(i);
});

// --- 実行報告系 (sekkyaku:execute:*) ---
router.on(id => id.startsWith('sekkyaku:execute:start:'), async (i) => {
    const storeName = i.customId.split(':')[3];
    await logHandler.showStartModal(i, storeName);
});

router.on(id => id.startsWith('sekkyaku:execute:end_menu:'), async (i) => {
    const storeName = i.customId.split(':')[3];
    await logHandler.showEndMenu(i, storeName);
});

router.on(id => id.startsWith('sekkyaku:execute:modal_submit:start:'), async (i) => {
    await logHandler.handleStartSubmit(i);
});

router.on(id => id.startsWith('sekkyaku:execute:end_select:'), async (i) => {
    await logHandler.handleEndSelect(i);
});

module.exports = router;
