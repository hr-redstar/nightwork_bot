const { ButtonStyle } = require('discord.js');
const { IDS } = require('./ids');

const KEIHI_SETTING_PANEL_SCHEMA = {
    title: '💸 経費設定パネル',
    color: '#5a5f7b',
    description: null,
    fields: [
        { key: 'panels', name: '経費申請パネル一覧', fallback: '未設置。ボタンから経費申請パネルを設置してください。' },
        { key: 'approvers', name: '承認役職', fallback: '未設定' },
    ],
    buttons: [
        [
            { id: IDS.BTN_SET_PANEL, label: '経費申請パネル設置', style: ButtonStyle.Primary },
            { id: IDS.BTN_SET_APPROVER, label: '承認役職', style: ButtonStyle.Secondary },
        ],
        [
            { id: IDS.BTN_EXPORT_CSV, label: '経費CSV発行', style: ButtonStyle.Success },
        ],
    ],
};

module.exports = { KEIHI_SETTING_PANEL_SCHEMA };
