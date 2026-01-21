const InteractionRouter = require('../../structures/InteractionRouter');

const router = new InteractionRouter();

// Register Routes
require('./routes/setting')(router);
require('./routes/request')(router);

module.exports = router;
