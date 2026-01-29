/**
 * src/modules/hearing_log/index.js
 */

const router = require('./router');

module.exports = {
    prefixes: ['hearing'], // 'hearing:' で始まるすべてのIDを奪取
    router
};
