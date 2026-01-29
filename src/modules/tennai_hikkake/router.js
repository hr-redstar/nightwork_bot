/**
 * src/modules/tennai_hikkake/router.js
 * 店内状況・ひっかけ機能のインタラクションルーティング (Platinum Edition)
 */

const InteractionRouter = require('../../structures/InteractionRouter');
const executeHandler = require('./handlers/ExecuteHandler');
const setupHandler = require('./handlers/SetupHandler');

const router = new InteractionRouter();

// --- 実行報告系 (Unified: tennai_hikkake:execute:*) ---
router.on(id => id.startsWith('tennai_hikkake:execute:modal_submit:'), (i) => executeHandler.handleModalSubmit(i));
router.on(id => id.startsWith('tennai_hikkake:execute:edit_select:'), (i) => executeHandler.handleEditSelect(i));
router.on(id => id.startsWith('tennai_hikkake:execute:'), (i) => executeHandler.handle(i));

// --- 管理セットアップ系 (Unified: tennai_hikkake:setup:*) ---
router.on('tennai_hikkake:setup:install', (i) => setupHandler.startSetup(i));
router.on('tennai_hikkake:setup:select_store', (i) => setupHandler.handleStoreSelected(i));
router.on(id => id.startsWith('tennai_hikkake:setup:select_channel:'), (i) => setupHandler.handleChannelSelected(i));
router.on('tennai_hikkake:setup:approveRole', (i) => setupHandler.showApproveRoleSelect(i));
router.on('tennai_hikkake:setup:role_submit', (i) => setupHandler.handleRoleSubmit(i));

// --- 管理設定画面リダイレクト (tennai_hikkake:setting:*) ---
router.on(id => id.startsWith('tennai_hikkake:setting:'), (i) => {
    const action = i.customId.split(':')[2];
    if (action === 'install') return setupHandler.startSetup(i);
    if (action === 'approveRole') return setupHandler.showApproveRoleSelect(i);
});

// --- 旧互換レイヤー (Legacy Mapping) ---
router.on('setup_hikkake_all', (i) => setupHandler.startSetup(i));
router.on('setup_hikkake_store', (i) => setupHandler.startSetup(i));
router.on('select_store_for_hikkake', (i) => setupHandler.handleStoreSelected(i));
router.on(id => id.startsWith('select_channel_for_hikkake_'), (i) => setupHandler.handleChannelSelected(i));
router.on(id => id.startsWith('hikkake_report_'), (i) => executeHandler.handle(i));
router.on(id => id.startsWith('hikkake_edit_select'), (i) => executeHandler.handleEditSelect(i));
router.on(id => id.startsWith('hikkake_report_modal'), (i) => executeHandler.handleModalSubmit(i));

module.exports = router;
