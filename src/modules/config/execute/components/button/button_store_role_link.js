// src/handlers/config/components/button/button_store_role_link.js
// ----------------------------------------------------
// 店舗 × ロール紐づけ 入口ボタン
// ----------------------------------------------------

const selectStoreForStoreRole = require('../../select/storeRole/select_store_for_storeRole.js');

module.exports = {
  customId: 'config:store:role:link',

  async handle(interaction) {
    return selectStoreForStoreRole.show(interaction);
  }
};
