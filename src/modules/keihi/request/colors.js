const Theme = require('../../../utils/ui/Theme');

// 申請/修正=青、承認=緑、削除=赤
const COLORS = {
  BLUE: Theme.COLORS.BRAND,
  GREEN: Theme.COLORS.APPROVAL,
  RED: Theme.COLORS.REJECT,
};

module.exports = { COLORS };