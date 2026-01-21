const PREFIX = 'syut:setting';

const IDS = {
    PREFIX,
    // Actions
    INSTALL_CAST: `${PREFIX}:install:cast`,
    INSTALL_KURO: `${PREFIX}:install:kuro`,
    CSV: `${PREFIX}:csv`,
    APPROVE_ROLE_MENU: `${PREFIX}:approve_role_menu`,

    // Setup (Selections)
    ROLE_SET: `${PREFIX}:role:set`, // Previous: syut:setup:role

    // Legacy (Support if needed)
    LEGACY_SETUP_ROLE: 'syut:setup:role'
};

module.exports = { IDS };
