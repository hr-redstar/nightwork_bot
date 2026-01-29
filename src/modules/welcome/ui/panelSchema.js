/**
 * src/modules/welcome/ui/panelSchema.js
 * ようこそ設定パネルの定型定義
 */

const { ButtonStyle } = require('discord.js');

const IDS = {
    BTN_SET_CHANNEL: 'welcome:channel:set',
    BTN_SET_MESSAGE: 'welcome:message:set',
    BTN_MANAGE_IMAGE: 'welcome:image:menu',
    PANEL_REFRESH: 'welcome:panel:refresh'
};

const WELCOME_PANEL_SCHEMA = {
    title: '🎉 ようこそ設定パネル',
    description: 'サーバーに新しいメンバーが参加した際の挨拶設定を行います。',
    color: '#00b894',
    fields: [
        { name: 'ウェルカム挨拶チャンネル', key: 'channel', fallback: '未設定' },
        { name: 'ウェルカム挨拶メッセージ', key: 'message', fallback: '未設定' },
        { name: 'ウェルカム挨拶ランダム画像設定', key: 'image', fallback: 'OFF' },
        { name: '🧩 ウェルカム挨拶で使用できる関数', key: 'variables', fallback: '読み込み中...' }
    ],
    buttons: [
        { id: IDS.BTN_SET_CHANNEL, label: '挨拶チャンネル設定', style: ButtonStyle.Primary },
        { id: IDS.BTN_SET_MESSAGE, label: '挨拶メッセージ設定', style: ButtonStyle.Primary },
        { id: IDS.BTN_MANAGE_IMAGE, label: '挨拶ランダム画像', style: ButtonStyle.Secondary }
    ]
};

module.exports = { IDS, WELCOME_PANEL_SCHEMA };
