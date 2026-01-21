// src/modules/kpi/panel/sendKpiPanel.js
// Placeholder for sending the user-facing KPI panel.

async function sendKpiPanel({ guild, channel, storeId }) {
  // TODO: Implement the actual panel sending logic
  await channel.send(`This is the KPI panel for store: ${storeId}`);
}

module.exports = {
  sendKpiPanel,
};