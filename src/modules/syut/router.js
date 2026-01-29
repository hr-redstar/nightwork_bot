/**
 * src/modules/syut/router.js
 * 出退勤機能のインタラクションルーティング (Platinum Edition)
 */

const InteractionRouter = require('../../structures/InteractionRouter');
const setupHandler = require('./handlers/SetupHandler');
const punchHandler = require('./handlers/PunchHandler');
const { postSyutSettingPanel } = require('./ui/panel');

const router = new InteractionRouter();

// --- 管理設定系 (syut:setting:*) ---
router.on('syut:setting:refresh', async (i) => {
    await postSyutSettingPanel(i);
});

router.on(id => id.startsWith('syut:setting:install:'), async (i) => {
    const type = i.customId.split(':')[3];
    await setupHandler.startSetup(i, type);
});

// --- セットアップフロー (syut:setup:*) ---
router.on(id => id.startsWith('syut:setup:select_store:'), async (i) => {
    await setupHandler.handleStoreSelected(i);
});

router.on(id => (id.startsWith('syut_cast:select_channel:') || id.startsWith('syut_kuro:select_channel:')), async (i) => {
    await setupHandler.handleChannelSelected(i);
});

// --- 運用打刻系 (syut:punch:*) ---
router.on(id => id.startsWith('syut:punch:in:') || id.startsWith('syut:punch:out:'), async (i) => {
    await punchHandler.handlePunch(i);
});

router.on(id => id.startsWith('syut:punch:refresh:'), async (i) => {
    await punchHandler.handleRefresh(i);
});

router.on(id => id.startsWith('syut:punch:manual:'), async (i) => {
    await punchHandler.handleManual(i);
});

module.exports = router;
