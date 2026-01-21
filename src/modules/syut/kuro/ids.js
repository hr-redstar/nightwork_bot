const PREFIX = 'syut:kuro';

const IDS = {
    PREFIX,
    BUTTON: {
        TODAY_SETUP: `${PREFIX}:btn:today_setup`, // + :storeName
        ROLE_SETUP: `${PREFIX}:btn:role_setup`,   // + :storeName
        REGISTER: `${PREFIX}:btn:register`,       // + :storeName
        MANUAL_REGISTER: `${PREFIX}:btn:manual_register`, // + :storeName
        USER_OK: `${PREFIX}:btn:user_ok`,         // + :storeName:userId
    },
    SELECT: {
        ROLE_SELECT: `${PREFIX}:sel:role_select`, // + :storeName
        MEMBER_SELECT: `${PREFIX}:sel:user_select`, // + :storeName
        STATUS_SELECT: `${PREFIX}:sel:status_select`, // + :storeName:userId
    },
    MODAL: {
        MANUAL: `${PREFIX}:modal:manual`,         // + :storeName
    },
    // Legacy prefixes
    LEGACY_PREFIX: 'kuro_',
    LEGACY_REGEX: /^kuro_/
};

module.exports = { IDS };
