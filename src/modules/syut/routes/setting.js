const { IDS } = require('../setting/ids');
const settingActions = require('../setting/settingActions');

module.exports = (router) => {
    // ====================================================
    // Syut Setting Module Routes
    // ====================================================

    // Install Cast
    router.on(IDS.INSTALL_CAST, (i) => settingActions.handleInstallCastButton(i));

    // Install Kuro
    router.on(IDS.INSTALL_KURO, (i) => settingActions.handleInstallKuroButton(i));

    // CSV
    router.on(IDS.CSV, (i) => settingActions.handleCsvButton(i));

    // Approve Role Menu
    router.on(IDS.APPROVE_ROLE_MENU, (i) => settingActions.handleApproveRoleMenuButton(i));

    // Role Set (Select)
    router.on(IDS.ROLE_SET, (i) => settingActions.handleRoleSetSelect(i));
    router.on(IDS.LEGACY_SETUP_ROLE, (i) => settingActions.handleRoleSetSelect(i));
};
