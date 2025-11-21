// src/utils/config/migrateStoreRoleConfig.js
// ----------------------------------------------------
// 店舗・役職・ロール設定の全ギルド自動マイグレーション
// ----------------------------------------------------

const fs = require("fs");
const path = require("path");
const logger = require("../logger");
const { readJSON, saveJSON } = require("../gcs");

function getAllGuildDirectories(basePath) {
  if (!fs.existsSync(basePath)) return [];
  return fs
    .readdirSync(basePath, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

function storeRoleConfigPath(guildId) {
  return `GCS/${guildId}/config/店舗_役職_ロール.json`;
}

async function migrateGuild(guildId) {
  const filePath = storeRoleConfigPath(guildId);

  const config = await readJSON(filePath);
  if (!config) {
    logger.warn(`[migrate] ${guildId} → 店舗_役職_ロール.json が存在しない`);
    return;
  }

  // 新形式かどうかチェック
  const isNewFormat = config.user_info !== undefined;

  if (isNewFormat) {
    logger.info(`[migrate] ${guildId} → 既に新フォーマット`);
    return;
  }

  logger.info(`[migrate] ${guildId} → 旧フォーマットを検出、変換します…`);

  // ----------------------------------------------------
  // 新フォーマットへ変換
  // ----------------------------------------------------
  const migrated = {
    stores: config.stores || [],
    roles: config.roles || [],
    link_store_role: config.link_store_role || {},
    link_role_role: config.link_role_role || {},
    user_info: {}, // 追加
  };

  await saveJSON(filePath, migrated);

  logger.info(`[migrate] ${guildId} → マイグレーション完了`);
}

async function migrateAllGuilds() {
  try {
    const base = path.join(process.cwd(), "local_data", "GCS");
    const guildDirs = getAllGuildDirectories(base);

    logger.info(`🔍 マイグレーション対象ギルド: ${guildDirs.length}件`);

    for (const guildId of guildDirs) {
      await migrateGuild(guildId);
    }

    logger.info("🎉 全ギルドの店舗_役職_ロール.json マイグレーション完了");
  } catch (err) {
    logger.error("❌ マイグレーション中にエラー:", err);
  }
}

module.exports = {
  migrateAllGuilds,
};
