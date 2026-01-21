// src/commands/13_設定KPI.js
// ----------------------------------------------------
// /設定kpi
// KPI 設定パネル（共通テンプレート）を表示
// ----------------------------------------------------

const { SlashCommandBuilder } = require('discord.js');
const { sendKpiSettingPanel } = require('../modules/kpi/setting/sendKpiSettingPanel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('設定kpi')
    .setDescription('KPIの設定パネルを表示します'),

  async execute(interaction) {
    await sendKpiSettingPanel(interaction);
  },
};