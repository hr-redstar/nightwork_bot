// src/handlers/config/components/button/button_user_register.js
// ----------------------------------------------------
// 👤 ユーザー情報登録（開始）
// ----------------------------------------------------

const step1 = require('../../select/user/select_user_chooseMember.js');

module.exports = {
  customId: 'config_user_register',

  async execute(interaction) {
    return step1.show(interaction);
  },
};
