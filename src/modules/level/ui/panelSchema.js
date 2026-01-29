/**
 * src/modules/level/ui/panelSchema.js
 */

const { ButtonStyle } = require('discord.js');
const Theme = require('../../../utils/ui/Theme');

const IDS = {
    BTN_SET_CHANNEL: 'level:channel:set',
    BTN_SET_MESSAGE: 'level:message:set',
    BTN_XP_CHAT: 'level:xp:chat',
    BTN_XP_VC: 'level:xp:vc',
    BTN_XP_WORK: 'level:xp:work',
    BTN_RANKING_PANEL: 'level:ranking:panel',
    PANEL_REFRESH: 'level:panel:refresh'
};

const LEVEL_PANEL_SCHEMA = {
    title: '📈 レベル設定パネル',
    description: 'レベル通知・XP獲得ルール・ランキング表示の設定を行います。',
    color: Theme.COLORS.BRAND_HEX,
    fields: [
        { name: 'レベル通知チャンネル', key: 'channel', fallback: '未設定' },
        { name: 'レベルアップメッセージ', key: 'message', fallback: '未設定' },
        { name: 'XP獲得ルール', key: 'xp_rules', fallback: '読み込み中...' }
    ],
    buttons: [
        // 1段目
        { id: IDS.BTN_SET_CHANNEL, label: 'レベル通知チャンネル設定', style: ButtonStyle.Primary },
        { id: IDS.BTN_SET_MESSAGE, label: 'レベルアップメッセージ設定', style: ButtonStyle.Primary },
        // 2段目
        { id: IDS.BTN_XP_CHAT, label: 'チャット時xp', style: ButtonStyle.Secondary },
        { id: IDS.BTN_XP_VC, label: 'vc時間xp', style: ButtonStyle.Secondary },
        { id: IDS.BTN_XP_WORK, label: '出勤時間xp', style: ButtonStyle.Secondary },
        // 3段目
        { id: IDS.BTN_RANKING_PANEL, label: 'レベルランキングパネル送信', style: ButtonStyle.Success }
    ]
};

module.exports = { IDS, LEVEL_PANEL_SCHEMA };
