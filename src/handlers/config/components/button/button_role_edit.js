// src/handlers/config/components/button/button_role_edit.js
// ----------------------------------------------------
// 👥 役職名一括編集（モーダル開く）
// ----------------------------------------------------

const modal = require('../modal/modal_role_edit.js');

module.exports = {
  customId: 'config_role_edit', // customId は IDS から取得

  async execute(interaction) {
    return modal.show(interaction);
  },
};
