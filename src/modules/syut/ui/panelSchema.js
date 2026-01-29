const Theme = require('../../../utils/ui/Theme');
const { ButtonStyle } = require('discord.js');

const SYUT_SETTING_PANEL_SCHEMA = {
    title: '⏰ 出退勤設定パネル',
    description: 'キャストおよび黒服の出退勤パネルの設置・管理を行います。',
    color: Theme.COLORS.BRAND_HEX,
    fields: [
        { key: 'cast', name: '👯 キャスト出退勤パネル', fallback: '未設置' },
        { key: 'kuro', name: '👔 黒服出退勤パネル', fallback: '未設置' },
    ],
    buttons: [
        [
            { id: 'syut:setting:install:cast', label: '👯 キャストパネル設置', style: ButtonStyle.Primary },
            { id: 'syut:setting:install:kuro', label: '👔 黒服パネル設置', style: ButtonStyle.Primary },
        ],
        [
            { id: 'syut:setting:refresh', label: '🔄 情報を更新', style: ButtonStyle.Secondary },
        ]
    ]
};

const SYUT_PUNCH_PANEL_SCHEMA = (type, storeName) => ({
    title: `${type === 'cast' ? '👯 キャスト' : '👔 黒服'} 出退勤パネル`,
    description: `🏬 **店舗: ${storeName}**\n本日も一日よろしくお願いします！`,
    color: type === 'cast' ? Theme.COLORS.CAST_HEX : Theme.COLORS.BRAND_HEX,
    fields: [
        { key: 'working', name: '✨ 現在の出勤者', fallback: '出勤中のメンバーはいません' },
    ],
    buttons: [
        [
            { id: `syut:punch:in:${type}:${storeName}`, label: '🔆 出勤', style: ButtonStyle.Success },
            { id: `syut:punch:out:${type}:${storeName}`, label: '🌙 退勤', style: ButtonStyle.Danger },
        ],
        [
            { id: `syut:punch:manual:${type}:${storeName}`, label: '✏️ 手入力登録', style: ButtonStyle.Secondary },
            { id: `syut:punch:refresh:${type}:${storeName}`, label: '🔄 更新', style: ButtonStyle.Secondary },
        ]
    ]
});

module.exports = { SYUT_SETTING_PANEL_SCHEMA, SYUT_PUNCH_PANEL_SCHEMA };
