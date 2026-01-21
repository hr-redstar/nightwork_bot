// src/modules/kpi/store/kpiConfigStore.js
// Placeholder for KPI configuration storage.
// Replace with actual GCS/JSON loading logic later.

const logger = require('../../../utils/logger');
const tempStore = new Map();

async function get(guildId) {
  // TODO: Load from GCS/`GCS/{guildId}/kpi/config.json`
  return {};
}

async function save(guildId, data) {
  // TODO: Merge with existing config and save to GCS
  logger.info(`[kpiConfigStore] Saving for ${guildId}:`, data);
}

async function setTemp(guildId, data) {
  tempStore.set(guildId, data);
}

async function getTemp(guildId) {
  return tempStore.get(guildId);
}

async function saveTarget(guildId, data) {
  logger.info(`[kpiConfigStore] Saving target for ${guildId}:`, data);
}

async function saveApply(guildId, data) {
  logger.info(`[kpiConfigStore] Saving application for ${guildId}:`, data);
}

async function getTarget(guildId) { return null; }
async function getApply(guildId) { return null; }

module.exports = {
  get,
  save,
  setTemp,
  getTemp,
  saveTarget,
  saveApply,
  getTarget,
  getApply,
};