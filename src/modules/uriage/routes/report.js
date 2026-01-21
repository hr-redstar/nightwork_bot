const { IDS: REP_IDS } = require('../report/ids');
const { STATUS_IDS } = require('../report/statusIds');

const reportFlow = require('../report/reportFlow');
const actionStatus = require('../report/actionStatus');
const rolesButtons = require('../report/rolesButtons');

/**
 * Registers a route that extracts a parameter using regex.
 * @param {import('../../../structures/InteractionRouter')} router 
 * @param {RegExp} regex 
 * @param {Function} handler 
 */
function routeWithParam(router, regex, handler) {
    router.on(regex, (i) => {
        const match = i.customId.match(regex);
        return handler(i, match ? match[1] : null);
    });
}

module.exports = (router) => {
    // ====================================================
    // Uriage Report Module Routes
    // ====================================================

    // --- Report Start (Button on Panel) ---
    // uriage:report:btn:report_open
    router.on(REP_IDS.BUTTON.REPORT_OPEN, (i) => reportFlow.handleReportButton(i));
    router.on('uriage_report:btn:report', (i) => reportFlow.handleReportButton(i)); // Legacy

    // --- Report Modal Submit ---
    // uriage:report:submit:modal
    router.on(id => id.startsWith(REP_IDS.MODAL.REPORT), (i) => reportFlow.handleReportModal(i));
    // Legacy: uriage_report:modal
    router.on(id => id.startsWith('uriage_report:modal') && !id.includes(':modify'), (i) => reportFlow.handleReportModal(i));


    // --- Status Actions ---
    // Approve
    router.on(id => id.startsWith(STATUS_IDS.APPROVE), (i) => actionStatus.handleApproveButton(i));
    router.on(id => id.startsWith('uriage_report_status:approve'), (i) => actionStatus.handleApproveButton(i)); // Legacy
    // Short Format (Common)
    router.on(id => id.startsWith('uriage:approve:'), (i) => actionStatus.handleApproveButton(i));

    // Modify (Edit)
    router.on(id => id.startsWith(STATUS_IDS.MODIFY), (i) => actionStatus.handleModifyButton(i));
    router.on(id => id.startsWith('uriage_report_status:modify'), (i) => actionStatus.handleModifyButton(i)); // Legacy
    router.on(id => id.startsWith('uriage:edit:'), (i) => actionStatus.handleModifyButton(i)); // Short Format

    // Modify Modal Submit
    // Note: Modify modal ID isn't strictly defined in statusIds but usually follows conventions or is dynamic.
    // In report/index.js, it checked 'uriage_report:modal' and action 'modify'.
    // Let's match the standardized way if possible or catch legacy pattern.
    // If standardized is `uriage:report:status:modify:modal`? Or `uriage:report:modal:modify`?
    // Let's assume strict legacy support first.
    router.on(id => id.startsWith('uriage_report:modal:modify'), (i) => actionStatus.handleModifyModal(i));


    // Delete
    router.on(id => id.startsWith(STATUS_IDS.DELETE), (i) => actionStatus.handleDeleteButton(i));
    router.on(id => id.startsWith('uriage_report_status:delete'), (i) => actionStatus.handleDeleteButton(i));
    router.on(id => id.startsWith('uriage:delete:'), (i) => actionStatus.handleDeleteButton(i)); // Short Format


    // --- Roles View/Request (Panel Buttons) ---
    // view_roles: uriage:report:btn:view_roles:storeName
    // request_roles: uriage:report:btn:request_roles:storeName
    // Standard names based on previous manual parsing logic `uriage_report:btn:view_roles:storeName`.

    const VIEW_ROLES_REGEX = /^uriage:report:btn:view_roles:(.+)$/;
    const REQ_ROLES_REGEX = /^uriage:report:btn:request_roles:(.+)$/;

    // Legacy Regex (uriage_report:btn:view_roles:...)
    const VIEW_ROLES_LEGACY = /^uriage_report:btn:view_roles:(.+)$/;
    const REQ_ROLES_LEGACY = /^uriage_report:btn:request_roles:(.+)$/;

    routeWithParam(router, VIEW_ROLES_REGEX, rolesButtons.handleViewRolesButton);
    routeWithParam(router, REQ_ROLES_REGEX, rolesButtons.handleRequestRolesButton);

    routeWithParam(router, VIEW_ROLES_LEGACY, rolesButtons.handleViewRolesButton);
    routeWithParam(router, REQ_ROLES_LEGACY, rolesButtons.handleRequestRolesButton);

    // Select Menus for Roles
    router.on(id => id.startsWith(REP_IDS.SELECT.VIEW_ROLES), (i) => rolesButtons.handleViewRolesSelect(i));
    router.on(id => id.startsWith(REP_IDS.SELECT.REQUEST_ROLES), (i) => rolesButtons.handleRequestRolesSelect(i));

    // Legacy Selects (uriage_report:sel:view_roles)
    router.on(id => id.startsWith('uriage_report:sel:view_roles'), (i) => rolesButtons.handleViewRolesSelect(i));
    router.on(id => id.startsWith('uriage_report:sel:request_roles'), (i) => rolesButtons.handleRequestRolesSelect(i));
};
