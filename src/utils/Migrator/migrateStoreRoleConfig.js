// src/utils/config/migrateStoreRoleConfig.js
// ----------------------------------------------------
// 店舗・役職・ロール設定の全ギルド自動マイグレーション
// ----------------------------------------------------

const fs = require("fs");
const path = require("path");
const logger = require("../logger");
const { configPath: oldConfigPath, getGuildConfig, saveGuildConfig } = require('../config/gcsConfigManager');
const { loadStoreRoleConfig, saveStoreRoleConfig } = require('../config/storeRoleConfigManager');

function getAllGuildDirectories(basePath) {
  if (!fs.existsSync(basePath)) return [];
  return fs
    .readdirSync(basePath, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

async function migrateGuild(guildId) {
  // 1. 新しい設定ファイルをまず読み込んでみる
  const newConfig = await loadStoreRoleConfig(guildId);
  // 既に店舗情報があればマイグレーション済みとみなす
  if (newConfig && newConfig.stores && newConfig.stores.length > 0) {
    logger.info(`[migrate] ${guildId} → 既に店舗情報が存在するためスキップ`);
    return;
  }

  // 2. 古い設定ファイル(config.json)を読み込む
  const oldConfig = await getGuildConfig(guildId);
  if (!oldConfig || !oldConfig.stores || oldConfig.stores.length === 0) {
    logger.warn(`[migrate] ${guildId} → 古い設定(config.json)に店舗情報が見つからないためスキップ`);
    return;
  }

  logger.info(`[migrate] ${guildId} → 旧フォーマットを検出、変換します…`);

  // 3. 新フォーマットへ変換
  const migrated = {
    stores: oldConfig.stores || [],
    roles: oldConfig.roles || [],
    storeRoles: oldConfig.link_store_role || {},
    roleMembers: {},
    updatedAt: null,
  };

  // 4. 新しい設定ファイルとして保存
  await saveStoreRoleConfig(guildId, migrated);

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
