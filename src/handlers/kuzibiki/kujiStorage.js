const gcs = require('../../utils/gcs');

function getKujiStoragePath(guildId) {
    return `${guildId}/kuzibiki/settings.json`;
}

async function readStorage() {
    // This function is no longer needed as we read per-guild
    return {};
}

async function getKujiSettings(guildId) {
    const storagePath = getKujiStoragePath(guildId);
    const data = await gcs.readJSON(storagePath);
    return data?.settings || [];
}

async function saveKujiSettings(guildId, settings) {
    const storagePath = getKujiStoragePath(guildId);
    const data = await gcs.readJSON(storagePath) || {};
    data.settings = settings;
    await gcs.writeJSON(storagePath, data);
}

async function getPanelMessageId(guildId) {
    const storagePath = getKujiStoragePath(guildId);
    const data = await gcs.readJSON(storagePath);
    return data?.panelMessageId || null;
}

async function savePanelMessageId(guildId, messageId) {
    const storagePath = getKujiStoragePath(guildId);
    const data = await gcs.readJSON(storagePath) || {};
    data.panelMessageId = messageId;
    await gcs.writeJSON(storagePath, data);
}

module.exports = { getKujiSettings, saveKujiSettings, getPanelMessageId, savePanelMessageId };