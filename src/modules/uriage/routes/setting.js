const { IDS: SETTING_IDS } = require('../setting/ids');
const settingCsv = require('../setting/csv');
const settingLocation = require('../setting/panelLocation');
const settingApprover = require('../setting/approver');
const settingPanel = require('../setting/panel');

module.exports = (router) => {
    // ====================================================
    // Uriage Setting Module Routes
    // ====================================================

    // --- Panel Setting ---
    // BTN_SET_PANEL (uriage:setting:panel:refresh)
    router.on(SETTING_IDS.BTN_SET_PANEL, (i) => settingLocation.handleSetPanelButton(i));
    router.on('uriage_config:btn:set_panel', (i) => settingLocation.handleSetPanelButton(i)); // Legacy

    // SEL_STORE_FOR_PANEL (uriage:setting:panel:store_select)
    router.on(SETTING_IDS.SEL_STORE_FOR_PANEL, (i) => settingLocation.handleStoreForPanelSelect(i));
    router.on('uriage_config:sel:store_for_panel', (i) => settingLocation.handleStoreForPanelSelect(i)); // Legacy

    // PANEL_CHANNEL (uriage:setting:panel:channel_select:*)
    router.on(id => id.startsWith(SETTING_IDS.PANEL_CHANNEL_PREFIX), (i) =>
        settingLocation.handlePanelChannelSelect(i, settingPanel.refreshUriageSettingPanelMessage)
    );
    router.on(id => id.startsWith('uriage_config:sel:panel_channel:'), (i) =>
        settingLocation.handlePanelChannelSelect(i, settingPanel.refreshUriageSettingPanelMessage)
    ); // Legacy

    // --- Approver Setting ---
    // BTN_SET_APPROVER (uriage:setting:approver:set)
    router.on(SETTING_IDS.BTN_SET_APPROVER, (i) => settingApprover.handleSetApproverButton(i));
    router.on('uriage_config:btn:set_approver', (i) => settingApprover.handleSetApproverButton(i)); // Legacy

    // SEL_APPROVER_ROLES (uriage:setting:approver:role_select)
    router.on(SETTING_IDS.SEL_APPROVER_ROLES, (i) => settingApprover.handleApproverRolesSelect(i));
    router.on('uriage_config:sel:approver_roles', (i) => settingApprover.handleApproverRolesSelect(i)); // Legacy


    // --- CSV Flow ---
    // BTN_EXPORT_CSV (uriage:setting:csv:export)
    router.on(SETTING_IDS.BTN_EXPORT_CSV, (i) => settingCsv.handleExportCsvButton(i));
    router.on('uriage_config:btn:export_csv', (i) => settingCsv.handleExportCsvButton(i)); // Legacy

    // CSV Buttons (Range)
    const csvButtons = [
        SETTING_IDS.BUTTON_CSV_RANGE_DAILY,
        SETTING_IDS.BUTTON_CSV_RANGE_MONTHLY,
        SETTING_IDS.BUTTON_CSV_RANGE_YEARLY,
        SETTING_IDS.BUTTON_CSV_RANGE_QUARTER,
    ];

    // Register CSV range buttons
    csvButtons.forEach(id => router.on(id, (i) => settingCsv.handleCsvFlowInteraction(i)));

    // Legacy CSV Range Buttons
    router.on('uriage_config:btn:csv_range_daily', (i) => settingCsv.handleCsvFlowInteraction(i));
    router.on('uriage_config:btn:csv_range_monthly', (i) => settingCsv.handleCsvFlowInteraction(i));
    router.on('uriage_config:btn:csv_range_yearly', (i) => settingCsv.handleCsvFlowInteraction(i));
    router.on('uriage_config:btn:csv_range_quarter', (i) => settingCsv.handleCsvFlowInteraction(i));


    // CSV Selects
    router.on(SETTING_IDS.SELECT_STORE_FOR_CSV, (i) => settingCsv.handleCsvFlowInteraction(i));
    router.on(SETTING_IDS.SELECT_CSV_TARGET, (i) => settingCsv.handleCsvFlowInteraction(i));

    // Legacy CSV Selects
    router.on('uriage_config:select:csv_store', (i) => settingCsv.handleCsvFlowInteraction(i));
    router.on('uriage_config:sel:csv_store', (i) => settingCsv.handleCsvFlowInteraction(i)); // Very old alias
    router.on('uriage_config:select:csv_target', (i) => settingCsv.handleCsvFlowInteraction(i));
};
