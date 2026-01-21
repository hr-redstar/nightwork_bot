const InteractionRouter = require('../../structures/InteractionRouter');

const router = new InteractionRouter();

// Register Routes
require('./routes/setting')(router);
require('./routes/report')(router);

module.exports = router;
