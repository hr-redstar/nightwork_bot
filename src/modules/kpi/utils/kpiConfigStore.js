// src/modules/kpi/utils/kpiConfigStore.js

const { readJSON, saveJSON } = require('../../../utils/gcs');

const CONFIG_PATH = (guildId) => `GCS/${guildId}/kpi/config.json`;
const TARGETS_PATH = (guildId, period) => `GCS/${guildId}/kpi/targets/${period}.json`;

function createDefaultConfig() {
  return {
    settingPanel: {
      channelId: null,
      messageId: null,
    },
    approveRoleId: null,
    storePanels: {},
  };
}

async function getKpiConfig(guildId) {
  try {
    const data = await readJSON(CONFIG_PATH(guildId));
    return {
      ...createDefaultConfig(),
      ...(data || {}),
    };
  } catch (e) {
    if (e.code === 'ENOENT') {
      return createDefaultConfig();
    }
    throw e;
  }
}

async function saveKpiConfig(guildId, config) {
  await saveJSON(CONFIG_PATH(guildId), config);
}

async function saveKpiTarget(guildId, data) {
  const { period } = data;
  // TODO: Merge with existing target data if necessary
  await saveJSON(TARGETS_PATH(guildId, period), data);
}

async function getKpiTarget(guildId, period = 'current') {
  try {
    return await readJSON(TARGETS_PATH(guildId, period));
  } catch (e) {
    return null; // Not found is fine
  }
}

async function saveKpiApply(guildId, data) {
  // TODO: This should use the dailyStore to append records.
  console.log(`[kpiConfigStore] Saving KPI application for ${guildId}:`, data);
}

async function getKpiApply(guildId, period = 'current') {
  // TODO: This should load from daily data.
  return null;
}

module.exports = {
  getKpiConfig,
  saveKpiConfig,
  saveKpiTarget,
  getKpiTarget,
  saveKpiApply,
  getKpiApply,
};