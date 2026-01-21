const InteractionRouter = require('../../structures/InteractionRouter');

const router = new InteractionRouter();

// Register Routes
require('./routes/setting')(router);
require('./routes/cast')(router);
require('./routes/kuro')(router);
require('./routes/legacy')(router);

module.exports = router;
