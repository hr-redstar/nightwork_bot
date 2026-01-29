const Theme = require('../../../utils/ui/Theme');
const { ButtonStyle } = require('discord.js');

const SEKKYAKU_SETTING_PANEL_SCHEMA = {
    title: '📉 接客ログ管理設定',
    description: '接客データの蓄積と、店内状況へのリアルタイム連携を設定します。',
    color: Theme.COLORS.BRAND_HEX,
    fields: [
        { key: 'channel', name: '📊 ログ出力先 (スレッド親)', fallback: '未設定' },
        { key: 'status', name: '⚙️ 連携ステータス', fallback: '店内状況モジュールと接続中' },
    ],
    buttons: [
        [
            { id: 'sekkyaku:setting:set_channel', label: '📊 出力チャンネル設定', style: ButtonStyle.Primary },
            { id: 'sekkyaku:setting:refresh', label: '🔄 情報を更新', style: ButtonStyle.Secondary },
        ]
    ]
};

const SEKKYAKU_REPORT_PANEL_SCHEMA = {
    title: '📝 接客報告パネル',
    color: Theme.COLORS.BRAND_HEX,
    buttons: [
        [
            { id: 'sekkyaku:execute:start', label: '⛳ 接客開始報告', style: ButtonStyle.Success },
            { id: 'sekkyaku:execute:end_menu', label: '🏁 接客終了報告', style: ButtonStyle.Danger },
        ],
        [
            { id: 'sekkyaku:execute:history', label: '📋 本日の接客履歴', style: ButtonStyle.Secondary },
        ]
    ]
};

module.exports = { SEKKYAKU_SETTING_PANEL_SCHEMA, SEKKYAKU_REPORT_PANEL_SCHEMA };
