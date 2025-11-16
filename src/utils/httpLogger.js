const logger = require('./logger');

module.exports = function httpLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`);
  });
  next();
};