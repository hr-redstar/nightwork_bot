// src/handlers/config/components/button/button_store_add.js
// ----------------------------------------------------
// ➕ 店舗を追加するボタン
// ----------------------------------------------------

const modal = require('../modal/modal_store_add.js');

module.exports = {
  customId: 'CONFIG_STORE_ADD',

  async execute(interaction) {
    return modal.show(interaction);
  },
};
