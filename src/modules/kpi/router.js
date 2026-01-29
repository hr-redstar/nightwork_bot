/**
 * src/modules/kpi/router.js
 * KPI機能のインタラクションルーティング
 */

const InteractionRouter = require('../../structures/InteractionRouter');

// Handlers (必要に応じて集約)
const { handleApplyStart } = require('./panel/applyHandlers');
const { handleSubmitKpiApply } = require('./modal/modalHandlers');
const { handleKpiSetup, handleKpiSetting } = require('./setting/settingActions');
const { handleApproveAccept, handleApproveReject, handleApproveEdit } = require('./approve/approveHandlers');

const router = new InteractionRouter();

// --- 申請フロー ---
router.on('kpi:apply:start', handleApplyStart);

// --- モーダル送信 ---
router.on('kpi:modal:apply', handleSubmitKpiApply);

// --- 設定・セットアップ ---
router.on(id => id.startsWith('kpi:setup:'), (i) => {
    const subAction = i.customId.split(':')[2];
    return handleKpiSetup(i, subAction);
});

router.on(id => id.startsWith('kpi:setting:'), (i) => {
    const subAction = i.customId.split(':')[2];
    return handleKpiSetting(i, subAction);
});

// --- 承認フロー ---
router.on('kpi:approval:accept', handleApproveAccept);
router.on('kpi:approval:delete', handleApproveReject);
router.on('kpi:approval:reject', handleApproveReject);
router.on('kpi:approval:edit', handleApproveEdit);

module.exports = router;
