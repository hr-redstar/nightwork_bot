const { readJson, writeJson } = require('../gcs');
const logger = require('../logger');

const CONFIG_PATH = (guildId) => `GCS/${guildId}/config/config.json`;

/**
 * デフォルト設定テンプレート
 */
function createDefaultConfig(guildId) {
  return {
    guildId,
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    mappingFiles: {
      storeRoleMapping: null,
    },
    settings: {
      language: 'ja',
      timezone: 'Asia/Tokyo',
    },
  };
}

/**
 * ギルド全体設定を取得（存在しない場合は初期生成）
 */
async function getGuildConfig(guildId) {
  try {
    let config = await readJson(CONFIG_PATH(guildId));

    if (!config) {
      logger.warn(`⚠️ ${CONFIG_PATH(guildId)} が存在しません。初期ファイルを作成します。`);

      // デフォルト設定生成
      config = createDefaultConfig(guildId);

      // 自動保存
      await writeJson(CONFIG_PATH(guildId), config);
      logger.info(`✅ 初期config.json を生成しました (${guildId})`);
    }

    // 店舗ロール紐づけ設定を読み込み
    if (config.mappingFiles?.storeRoleMapping) {
      config.storeRoleMapping = await getStoreRoleMapping(guildId);
    }

    return config;
  } catch (err) {
    logger.error('❌ config.json の取得エラー:', err);
    return createDefaultConfig(guildId); // 万が一パース失敗時も安全に動作
  }
}

/**
 * ギルド全体設定を保存
 */
async function setGuildConfig(guildId, config) {
  try {
    const payload = { ...config, lastUpdated: new Date().toISOString() };
    await writeJson(CONFIG_PATH(guildId), payload);
    logger.info(`✅ config.json を更新しました (${guildId})`);
    return payload;
  } catch (err) {
    logger.error('❌ config.json の保存エラー:', err);
    throw err;
  }
}

module.exports = {
  getGuildConfig,
  setGuildConfig,
};
