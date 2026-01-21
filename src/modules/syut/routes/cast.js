const { IDS } = require('../cast/ids');
const { handleSyutCast } = require('../cast/handler');

module.exports = (router) => {
    // ====================================================
    // Syut Cast Module Routes
    // ====================================================
    // Since handleSyutCast is a monolithic handler that checks customId, 
    // we route all Cast-related interactions to it.

    // Check for Standard Prefix: syut:cast:
    router.on(id => id.startsWith(IDS.PREFIX), handleSyutCast);

    // Check for Legacy Prefix: cast_
    router.on(id => id.startsWith(IDS.LEGACY_PREFIX), handleSyutCast);

    // Note: In future refactoring, break down handleSyutCast into smaller functions and bind them here specificly.
};
