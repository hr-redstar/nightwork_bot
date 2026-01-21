const { ButtonStyle } = require('discord.js');

const CONFIG_PANEL_SCHEMA = {
    title: '⚙️ 設定パネル',
    color: '#3498db',
    description: '',
    fields: [
        { key: 'stores', name: '🏪 登録済み店舗一覧', fallback: '未登録' },
        { key: 'roles', name: '👥 登録済み役職一覧', fallback: '未登録' },
        { key: 'storeRoles', name: '🏢 店舗とロールの紐づけ', fallback: '未設定' },
        { key: 'positionRoles', name: '👔 役職とロールの紐づけ', fallback: '未設定' },
        { key: 'logs', name: '📜 ログ設定', fallback: '未設定' },
        { key: 'slack', name: '🔔 Slack通知自動化', fallback: '未設定' },
        { key: 'commandRole', name: '⚙️ コマンド実行役職', fallback: '未設定' },
    ],
    buttons: [
        [
            { id: 'config:store:edit', label: '店舗名編集', style: ButtonStyle.Primary },
            { id: 'config:role:edit', label: '役職編集', style: ButtonStyle.Primary },
            { id: 'config:store:role:link', label: '店舗とロール紐づけ', style: ButtonStyle.Secondary },
            { id: 'config:position:role:link', label: '役職とロール紐づけ', style: ButtonStyle.Secondary },
        ],
        [
            { id: 'config:user:register', label: 'ユーザー情報登録', style: ButtonStyle.Success },
            { id: 'config:command:role', label: 'コマンド実行役職', style: ButtonStyle.Secondary },
        ],
        [
            { id: 'config:global:log', label: 'グローバルログ', style: ButtonStyle.Secondary },
            { id: 'config:admin:log', label: '管理者ログ', style: ButtonStyle.Secondary },
            { id: 'config:command:thread', label: 'コマンドログ', style: ButtonStyle.Secondary },
            { id: 'config:setting:thread', label: '設定ログ', style: ButtonStyle.Secondary },
        ],
        [
            { id: 'config:slack:auto', label: 'Slack通知', style: ButtonStyle.Primary },
        ],
    ],
};

module.exports = { CONFIG_PANEL_SCHEMA };
