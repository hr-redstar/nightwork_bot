const { ButtonStyle } = require('discord.js');
const { IDS } = require('./ids');
const Theme = require('../../../utils/ui/Theme');

const URIAGE_SETTING_PANEL_SCHEMA = {
    title: '💰 売上設定パネル',
    color: Theme.COLORS.BRAND_HEX,
    description: null,
    fields: [
        { key: 'panels', name: '売上報告パネル一覧', fallback: '未設置\n「売上報告パネル設置」ボタンからパネルを作成してください。' },
        { key: 'approvers', name: '承認役職', fallback: '未設定' },
        { key: 'csv', name: '売上CSV出力', fallback: '最新更新：未集計\n※「売上CSV発行」ボタンから生成できます。' },
    ],
    buttons: [
        [
            { id: IDS.BTN_SET_PANEL, label: '売上報告パネル設置', style: ButtonStyle.Primary },
            { id: IDS.BTN_SET_APPROVER, label: '承認役職', style: ButtonStyle.Secondary },
        ],
        [
            { id: IDS.BTN_EXPORT_CSV, label: '売上CSV発行', style: ButtonStyle.Success },
        ],
    ],
};

module.exports = { URIAGE_SETTING_PANEL_SCHEMA };
