const Theme = require('../../../utils/ui/Theme');
const { ButtonStyle } = require('discord.js');

const HEARING_PANEL_SCHEMA = {
    title: '👂 ヒアリング報告パネル',
    description: '日々のヒアリング内容を記録し、後から簡単に検索・参照できます。',
    color: Theme.COLORS.BRAND_HEX,
    fields: [
        { key: 'targetChannel', name: 'ログ出力先チャンネル', fallback: '未設定' },
        { key: 'currentThread', name: '現在の稼持スレッド', fallback: '未作成' },
    ],
    buttons: [
        [
            { id: 'hearing:report:start', label: '👂 ヒアリング報告', style: ButtonStyle.Primary },
            { id: 'hearing:search:menu', label: '🔍 キーワード検索', style: ButtonStyle.Secondary },
        ],
        [
            { id: 'hearing:setting:set_channel', label: '⚙️ 出力チャンネル設定', style: ButtonStyle.Secondary },
        ]
    ]
};

module.exports = { HEARING_PANEL_SCHEMA };
