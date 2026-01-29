const { IDS: REQ_IDS } = require('../request/requestIds');
const { STATUS_IDS } = require('../request/statusIds');
const { IDS: REQ_MAIN_IDS } = require('../request/ids');

const reqStart = require('../request/handlers/RequestStartHandler');
const reqModal = require('../request/requestModal');
const reqApprove = require('../request/action_approve');
const reqModify = require('../request/action_modify');
const reqDelete = require('../request/action_delete');
const reqItem = require('../request/itemConfig');
const reqRole = require('../request/roleConfig');

// 🌟 Platinum Handlers (New Architecture)
const { handleApprove: handleApprovePlatinum } = require('../handlers/ApprovalHandler');
const { handleModifyButton: handleModifyButtonPlatinum, handleModifyModalSubmit: handleModifyModalSubmitPlatinum } = require('../handlers/ModifyHandler');
const { handleDelete: handleDeletePlatinum } = require('../handlers/DeleteHandler');

const reqItemSelectHandler = require('../request/handlers/RequestItemSelectHandler');
const itemConfigHandler = require('../request/handlers/ItemConfigModalHandler');

/**
 * Registers a route that extracts a parameter using regex.
 * @param {import('../../../structures/InteractionRouter')} router 
 * @param {RegExp} regex 
 * @param {Function} handler 
 */
function routeWithParam(router, regex, handler) {
    router.on(regex, async (i) => {
        const match = i.customId.match(regex);
        const param = match ? match[1] : null;
        if (handler && typeof handler.execute === 'function') {
            return await handler.execute(i, param);
        }
        return await handler(i, param);
    });
}

module.exports = (router) => {
    // ====================================================
    // Request Module Routes
    // ====================================================

    // --- Request Start (Button on Panel) ---
    // Pattern: keihi:request:btn:request:[storeKey]
    routeWithParam(router, /^keihi:request:btn:request:(.+)$/, reqStart);
    routeWithParam(router, /^keihi_request:btn:request:(.+)$/, reqStart); // Legacy

    // --- Item Configuration (Modal & Button) ---
    // Button: keihi:request:btn:item_config:[storeKey]
    routeWithParam(router, /^keihi:request:btn:item_config:(.+)$/, itemConfigHandler);
    routeWithParam(router, /^keihi_request:btn:item_config:(.+)$/, itemConfigHandler); // Legacy

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
    router.on(REQ_IDS.REQUEST_ITEM_SELECT, reqItemSelectHandler);
    router.on('keihi_request_request_item', reqItemSelectHandler); // Legacy

    // Modal
    router.on(id => id.startsWith(REQ_IDS.REQUEST_MODAL), (i) => reqModal.handleRequestModalSubmit(i));
    router.on(id => id.startsWith('keihi_request_request_modal'), (i) => reqModal.handleRequestModalSubmit(i)); // Legacy


    // --- Status Actions ---
    // Approve (🌟 Platinum Handler)
    router.on(id => id.startsWith(STATUS_IDS.APPROVE), handleApprovePlatinum);
    router.on(id => id.startsWith('keihi_request_approve'), handleApprovePlatinum);

    // Modify (🌟 Platinum Handler)
    router.on(id => id.startsWith(STATUS_IDS.MODIFY), handleModifyButtonPlatinum);
    router.on(id => id.startsWith('keihi_request_modify'), handleModifyButtonPlatinum);
    router.on(id => id.startsWith(STATUS_IDS.MODIFY_MODAL), handleModifyModalSubmitPlatinum);
    router.on(id => id.startsWith('keihi_request_modify_modal'), handleModifyModalSubmitPlatinum);

    // Delete (🌟 Platinum Handler)
    router.on(id => id.startsWith(STATUS_IDS.DELETE), handleDeletePlatinum);
    router.on(id => id.startsWith('keihi_request_delete'), handleDeletePlatinum);
};
