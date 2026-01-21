const { IDS: REQ_IDS } = require('../request/requestIds');
const { STATUS_IDS } = require('../request/statusIds');
const { IDS: REQ_MAIN_IDS } = require('../request/ids');

const reqStart = require('../request/requestStart');
const reqModal = require('../request/requestModal');
const reqApprove = require('../request/action_approve');
const reqModify = require('../request/action_modify');
const reqDelete = require('../request/action_delete');
const reqItem = require('../request/itemConfig');
const reqRole = require('../request/roleConfig');

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
    // Request Module Routes
    // ====================================================

    // --- Request Start (Button on Panel) ---
    // Pattern: keihi:request:btn:request:[storeKey]
    routeWithParam(router, /^keihi:request:btn:request:(.+)$/, reqStart.handleRequestStart);
    routeWithParam(router, /^keihi_request:btn:request:(.+)$/, reqStart.handleRequestStart); // Legacy

    // --- Item Configuration (Modal & Button) ---
    // Button: keihi:request:btn:item_config:[storeKey]
    routeWithParam(router, /^keihi:request:btn:item_config:(.+)$/, reqItem.openItemConfigModal);
    routeWithParam(router, /^keihi_request:btn:item_config:(.+)$/, reqItem.openItemConfigModal); // Legacy

    // Modal Submit
    const ITEM_MODAL_START = REQ_MAIN_IDS.PREFIX.ITEM_CONFIG_MODAL; // keihi:request:item:config_modal
    const ITEM_MODAL_LEGACY = 'keihi_request:modal_item_config';
    router.on(id => id.startsWith(ITEM_MODAL_START), (i) => reqItem.handleItemConfigModalSubmit(i));
    router.on(id => id.startsWith(ITEM_MODAL_LEGACY), (i) => reqItem.handleItemConfigModalSubmit(i));

    // --- View Roles / Request Roles ---
    // Button: keihi:request:btn:view_roles:[storeKey]
    routeWithParam(router, /^keihi:request:btn:view_roles:(.+)$/, reqRole.openViewRolesSelect);
    // Legacy: split logic not easily mapped to regex catch-all cleanly unless we assume standard format. 
    // The previous implementation used split(':').pop(). 
    // We can use regex matching the end.
    routeWithParam(router, /^keihi_request:btn:view_roles:(.+)$/, reqRole.openViewRolesSelect);

    // Button: ...request_roles...
    routeWithParam(router, /^keihi:request:btn:request_roles:(.+)$/, reqRole.openRequestRolesSelect);
    routeWithParam(router, /^keihi_request:btn:request_roles:(.+)$/, reqRole.openRequestRolesSelect);


    // Select: keihi:request:role:view_select
    router.on(id => id.startsWith(REQ_MAIN_IDS.PREFIX.VIEW_ROLE_SELECT), (i) => reqRole.handleViewRoleSelect(i));
    router.on(id => id.startsWith(REQ_MAIN_IDS.PREFIX.REQUEST_ROLE_SELECT), (i) => reqRole.handleRequestRoleSelect(i));

    // Legacy Selects
    router.on(id => id.startsWith('keihi_request:sel_view_roles'), (i) => reqRole.handleViewRoleSelect(i));
    router.on(id => id.startsWith('keihi_request:sel_req_roles'), (i) => reqRole.handleRequestRoleSelect(i));


    // --- Request Submission ---
    // Select
    router.on(REQ_IDS.REQUEST_ITEM_SELECT, (i) => reqStart.handleRequestItemSelect(i));
    router.on('keihi_request_request_item', (i) => reqStart.handleRequestItemSelect(i)); // Legacy

    // Modal
    router.on(id => id.startsWith(REQ_IDS.REQUEST_MODAL), (i) => reqModal.handleRequestModalSubmit(i));
    router.on(id => id.startsWith('keihi_request_request_modal'), (i) => reqModal.handleRequestModalSubmit(i)); // Legacy


    // --- Status Actions ---
    // Approve
    router.on(id => id.startsWith(STATUS_IDS.APPROVE), (i) => reqApprove.handleApproveButton(i));
    router.on(id => id.startsWith('keihi_request_approve'), (i) => reqApprove.handleApproveButton(i));

    // Modify
    router.on(id => id.startsWith(STATUS_IDS.MODIFY), (i) => reqModify.handleModifyButton(i));
    router.on(id => id.startsWith('keihi_request_modify'), (i) => reqModify.handleModifyButton(i));
    router.on(id => id.startsWith(STATUS_IDS.MODIFY_MODAL), (i) => reqModify.handleModifyModalSubmit(i));
    router.on(id => id.startsWith('keihi_request_modify_modal'), (i) => reqModify.handleModifyModalSubmit(i));

    // Delete
    router.on(id => id.startsWith(STATUS_IDS.DELETE), (i) => reqDelete.handleDeleteButton(i));
    router.on(id => id.startsWith('keihi_request_delete'), (i) => reqDelete.handleDeleteButton(i));
};
