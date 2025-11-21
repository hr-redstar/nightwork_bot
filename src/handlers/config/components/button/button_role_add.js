// src/handlers/config/components/button/button_role_add.js
// ----------------------------------------------------
// 🎭 役職追加ボタン
// ----------------------------------------------------

const modal = require('../modal/modal_role_add.js');

module.exports = {
  customId: 'CONFIG_ROLE_ADD',

  async execute(interaction) {
    return modal.show(interaction);
  },
};
