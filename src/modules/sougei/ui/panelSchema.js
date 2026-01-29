const Theme = require('../../../utils/ui/Theme');
const { ButtonStyle } = require('discord.js');

const SOUGEI_SETTING_PANEL_SCHEMA = {
    title: '🚗 送迎管理設定パネル',
    description: '送迎業務の担当者設定や一覧確認を行います。',
    color: Theme.COLORS.BRAND_HEX,
    fields: [
        { key: 'roles', name: '👥 送迎者役職', fallback: '未設定' },
        { key: 'members', name: '📋 送迎可能メンバー一覧', fallback: '未設定' },
    ],
    buttons: [
        [
            { id: 'sougei:setting:set_role', label: '👥 送迎者役職設定', style: ButtonStyle.Primary },
            { id: 'sougei:setting:refresh', label: '🔄 情報を更新', style: ButtonStyle.Secondary },
        ]
    ]
};

module.exports = { SOUGEI_SETTING_PANEL_SCHEMA };
