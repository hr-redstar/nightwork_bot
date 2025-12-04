// src/utils/feature/featureConfigManagerTemplate.js
// ----------------------------------------------------
// 汎用 機能別設定 / 日次データ管理
// 例) GCS/{guildId}/{featureKey}/config.json
//     GCS/{guildId}/{featureKey}/{store}/{year}/{month}/{day}/YYYYMMDD.json
// ----------------------------------------------------

const dayjs = require('dayjs');
const logger = require('../logger');
const { readJSON, saveJSON } = require('../gcs');

/**
 * 機能共通 Config 管理ファクトリ
 * @param {string} featureKey 例: 'keihi', 'uriage', 'kpi'
 */
function createFeatureConfigManager(featureKey) {
  // ---------- パス生成 ----------
  const configPath = (guildId) =>
    `GCS/${guildId}/${featureKey}/config.json`;

  const dailyPath = (guildId, store, y, m, d) =>
    `GCS/${guildId}/${featureKey}/${store}/${y}/${m}/${d}/${y}${m}${d}.json`;

  // ---------- 設定読み込み ----------
  async function loadFeatureConfig(guildId) {
    try {
      const data = await readJSON(configPath(guildId));
      return (
        data || {
          // 店舗別パネル
          panels: {
            // [storeName]: { channelId, messageId }
          },
          // 役職設定
          roles: {
            approver: [],   // 承認役職ID配列
            viewer: [],     // 閲覧役職ID配列
            applicant: [],  // 申請/報告役職ID配列
          },
          // 店舗別の機能項目（経費項目など）
          storeItems: {
            // [storeName]: ['項目A', '項目B']
          },
          updatedAt: null,
        }
      );
    } catch (err) {
      logger.error(`❌ ${featureKey} 設定読込エラー(${guildId}):`, err);
      return {
        panels: {},
        roles: { approver: [], viewer: [], applicant: [] },
        storeItems: {},
        updatedAt: null,
      };
    }
  }

  // ---------- 設定保存 ----------
  async function saveFeatureConfig(guildId, config) {
    try {
      config.updatedAt = dayjs().format('YYYY/MM/DD HH:mm');
      await saveJSON(configPath(guildId), config);
    } catch (err) {
      logger.error(`❌ ${featureKey} 設定保存エラー(${guildId}):`, err);
    }
  }

  // ---------- 日次データ保存 ----------
  async function saveFeatureDaily(guildId, store, data, overwrite = false) {
    try {
      const dateStr = Array.isArray(data) ? data[0]?.date : data.date;
      const d = dayjs(dateStr);
      const y = d.isValid() ? d.format('YYYY') : dayjs().format('YYYY');
      const m = d.isValid() ? d.format('MM') : dayjs().format('MM');
      const dd = d.isValid() ? d.format('DD') : dayjs().format('DD');
      const filePath = dailyPath(guildId, store, y, m, dd);

      let arr = data;
      if (!overwrite) {
        const existing = (await readJSON(filePath)) || [];
        existing.push(data);
        arr = existing;
      }

      await saveJSON(filePath, arr);
    } catch (err) {
      logger.error(`❌ ${featureKey} 日次保存エラー:`, err);
    }
  }

  async function readFeatureDaily(guildId, store, y, m, d) {
    const filePath = dailyPath(guildId, store, y, m, d);
    return (await readJSON(filePath)) || [];
  }

  return {
    configPath,
    loadFeatureConfig,
    saveFeatureConfig,
    saveFeatureDaily,
    readFeatureDaily,
  };
}

module.exports = { createFeatureConfigManager };
