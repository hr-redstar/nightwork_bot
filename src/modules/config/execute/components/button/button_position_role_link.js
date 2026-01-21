// ----------------------------------------------------
// 役職 × ロール紐づけ 入口ボタン
// ----------------------------------------------------

const selectPosition = require('../../select/positionRole/select_position_for_roleLink.js');

module.exports = {
  customId: 'config_position_role_link',

  async handle(interaction) {
    return selectPosition.show(interaction);
  }
};
