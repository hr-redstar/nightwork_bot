const { handleLegacySyutInteraction } = require('../setting/legacyHandler');

module.exports = (router) => {
    // ====================================================
    // Syut Legacy Routes
    // ====================================================
    // Handles interactions starting with 'syut_' which are not covered by standardized routes.

    router.on(id => id.startsWith('syut_'), handleLegacySyutInteraction);
};
