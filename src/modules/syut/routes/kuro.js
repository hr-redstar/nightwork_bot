const { IDS } = require('../kuro/ids');
const { handleSyutKuro } = require('../kuro/handler');

module.exports = (router) => {
    // ====================================================
    // Syut Kuro Module Routes
    // ====================================================
    // Since handleSyutKuro is a monolithic handler, we route all Kuro interactions to it.

    // Check for Standard Prefix: syut:kuro:
    router.on(id => id.startsWith(IDS.PREFIX), handleSyutKuro);

    // Check for Legacy Prefix: kuro_
    router.on(id => id.startsWith(IDS.LEGACY_PREFIX), handleSyutKuro);
};
