// src/handlers/keihi/setting/index.js
// ----------------------------------------------------
// 経費「設定」系インタラクションのルーター
//   - 設定パネル上のボタン / セレクトを振り分け
// ----------------------------------------------------

const { IDS } = require('./ids');
const {
  handleExportCsvButton,
  handleCsvStoreSelect,
  handleCsvPeriodSelect,
} = require('./csvExport');

/**
 * 経費 設定系インタラクションを処理
 * @param {import('discord.js').Interaction} interaction
 */
async function handleSettingInteraction(interaction) {
  const customId = interaction.customId || '';

  // ボタン
  if (interaction.isButton()) {
    // 経費csv発行
    if (customId === IDS.BTN_EXPORT_CSV) {
      return handleExportCsvButton(interaction);
    }

    // それ以外（経費パネル設置 / 承認役職）は
    // まだ実装していないので何もしない
    return;
  }

  // セレクトメニュー
  if (interaction.isAnySelectMenu()) {
    if (customId === IDS.SEL_CSV_STORE) {
      return handleCsvStoreSelect(interaction);
    }

    if (customId.startsWith(IDS.SEL_CSV_PERIOD)) {
      return handleCsvPeriodSelect(interaction);
    }

    return;
  }

  // それ以外は何もしない
  return;
}

module.exports = {
  handleSettingInteraction,
};
