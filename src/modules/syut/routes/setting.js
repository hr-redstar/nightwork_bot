const { IDS } = require('../setting/ids');
const settingActions = require('../setting/settingActions');
const {
    handleCastRoleSetup,
    handleCastRoleSelect,
    handleCastDiscordRoleSelect,
    handleKurofukuRoleSetup,
    handleKurofukuRoleSelect,
    handleKurofukuDiscordRoleSelect
} = require('../setting/roleSetupHandlers');

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

    // 追加: 役職設定関連
    router.on(id => id.startsWith('cast_role_setup'), handleCastRoleSetup);
    router.on(id => id.startsWith('syut:cast:sel:role_select'), handleCastRoleSelect);
    router.on(id => id.startsWith('syut:cast:sel:discord_role'), handleCastDiscordRoleSelect);

    router.on(id => id.startsWith('kurofuku_role_setup'), handleKurofukuRoleSetup);
    // 黒服は内部的に 'staff' を使用するが、ボタンID等の互換性のためルート定義に注意
    router.on(id => id.startsWith('syut:staff:sel:role_select'), handleKurofukuRoleSelect);
    router.on(id => id.startsWith('syut:staff:sel:discord_role'), handleKurofukuDiscordRoleSelect);
};
