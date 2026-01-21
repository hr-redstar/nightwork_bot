// src/modules/common/utils/embed/getEmbedColor.js

const FUNCTIONS = require('../../constants/functions');

/**
 * 機能別 Embedカラー取得
 */
module.exports = function getEmbedColor(functionKey, guildConfig = {}) {
  const custom = guildConfig.embedColors?.[functionKey];
  if (custom) return Number(custom);

  return FUNCTIONS[functionKey]?.defaultColor ?? 0x2B2D31;
};
