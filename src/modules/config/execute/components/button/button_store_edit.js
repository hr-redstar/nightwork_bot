// src/handlers/config/components/button/button_store_edit.js
// ----------------------------------------------------
// 🏪 店舗名一括編集ボタン（旧 configModal_store の代替）
// ----------------------------------------------------
const modal = require('../modal/modal_store_edit.js');

module.exports = {
  customId: 'config_store_edit', // customId は IDS から取得

  async execute(interaction) {
    return modal.show(interaction);
  },
};
