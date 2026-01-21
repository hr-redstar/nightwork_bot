const { ButtonStyle } = require('discord.js');

const SYUT_SETTING_PANEL_SCHEMA = {
    title: '🕒 出退勤設定パネル',
    description: 'キャスト・黒服の出退勤設定を管理します。',
    color: '#3498db',
    fields: [
        { key: 'castPanels', name: '👗 キャスト出退勤一覧', fallback: '未設定' },
        { key: 'kuroPanels', name: '🕴️ 黒服出退勤一覧', fallback: '未設定' },
        { key: 'lastUpdated', name: '🕒 更新日時', fallback: '未設定' },
    ],
    buttons: [
        [
            { id: 'cast_syut_panel', label: 'キャスト出退勤パネル設置', style: ButtonStyle.Primary },
            { id: 'kuro_syut_panel', label: '黒服出退勤パネル設置', style: ButtonStyle.Secondary },
        ],
    ],
};

module.exports = { SYUT_SETTING_PANEL_SCHEMA };
