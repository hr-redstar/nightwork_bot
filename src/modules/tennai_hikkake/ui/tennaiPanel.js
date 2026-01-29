/**
 * src/modules/tennai_hikkake/ui/tennaiPanel.js
 * 店内状況・客数一覧パネル (Platinum UI)
 */

const { ButtonStyle } = require('discord.js');
const dayjs = require('dayjs');
const { buildPanel } = require('../../../utils/ui/PanelBuilder');
const Theme = require('../../../utils/ui/Theme');

/**
 * 動的な店内状況パネルを生成
 * @param {string} storeName 
 * @param {any[]} attendance 
 * @param {any[]} hikakakeLogs 
 */
function createDynamicTennaiPanel(storeName, attendance, hikakakeLogs) {
    // 1. 出勤キャスト総数
    const totalCast = attendance ? attendance.length : 0;

    // 2. 接客中キャスト数 (確定ログのみ)
    const confirmedCount = hikakakeLogs
        .filter(h => h.store === storeName && h.type === '確定')
        .reduce((sum, log) => sum + (log.num || 0), 0);

    // 3. 空きキャスト
    let freeCast = totalCast - confirmedCount;
    if (freeCast < 0) freeCast = 0;

    // 客数一覧の整形
    const customersList = hikakakeLogs
        .filter(h => h.store === storeName)
        .reverse() // 最新順
        .slice(0, 10) // 直近10件
        .map(h => {
            let icon = '🚶';
            let label = '報告';
            if (h.type === '予定') { icon = '🐟'; label = '予定'; }
            if (h.type === '確定') { icon = '🎣'; label = '確定'; }
            if (h.type === '失敗') { icon = '💨'; label = '失敗'; }

            return `${icon} **${label}** [${h.enterTime || '-'}] ${h.num || 0}名 / ${h.group || 1}組 (担:${h.castList?.join(',') || '-'}) by ${h.inputUser || '不明'}`;
        });

    const fields = [
        { name: '✨ 接客中', value: `${confirmedCount}名`, inline: true },
        { name: '👯 出勤', value: `${totalCast}名`, inline: true },
        { name: '💤 空き', value: `${freeCast}名`, inline: true },
        {
            name: '👥 直近の客数一覧',
            value: customersList.length > 0 ? customersList.join('\n') : 'データなし',
            inline: false
        }
    ];

    const buttons = [
        [
            { id: `tennai_hikkake:execute:plan:${storeName}`, label: '🐟 ひっかけ予定', style: ButtonStyle.Primary },
            { id: `tennai_hikkake:execute:failed:${storeName}`, label: '💨 ひっかけ失敗', style: ButtonStyle.Danger },
            { id: `tennai_hikkake:execute:edit_menu:${storeName}`, label: '✏️ 内容修正', style: ButtonStyle.Secondary },
        ],
        [
            { id: `tennai_hikkake:execute:success:${storeName}`, label: '🎣 ひっかけ確定', style: ButtonStyle.Success }
        ]
    ];

    return buildPanel({
        title: `🏬 店舗状況: ${storeName}`,
        description: `📅 ${dayjs().format('YYYY/MM/DD HH:mm')} 更新`,
        color: Theme.COLORS.BRAND_HEX,
        fields: fields,
        buttons: buttons,
        footer: '店内状況管理システム - Platinum Edition'
    });
}

module.exports = { createDynamicTennaiPanel };
