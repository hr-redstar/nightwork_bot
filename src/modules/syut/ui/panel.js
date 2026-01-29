const { MessageFlags } = require('discord.js');
const { buildPanel } = require('../../../utils/ui/PanelBuilder');
const { SYUT_SETTING_PANEL_SCHEMA, SYUT_PUNCH_PANEL_SCHEMA } = require('./panelSchema');
const service = require('../SyutService');

/**
 * 管理設定パネルを表示
 */
async function postSyutSettingPanel(interaction) {
    const { config } = await service.prepareSettingData(interaction.guildId);

    const formatPanelLink = (panelList) => {
        if (!panelList || Object.keys(panelList).length === 0) return '未設置';
        return Object.entries(panelList)
            .map(([store, info]) => `・**${store}** : <#${info.channelId}>`)
            .join('\n');
    };

    const dataMap = {
        cast: formatPanelLink(config.castPanelList),
        kuro: formatPanelLink(config.kurofukuPanelList)
    };

    const fields = SYUT_SETTING_PANEL_SCHEMA.fields.map(f => ({
        name: f.name,
        value: dataMap[f.key] || f.fallback
    }));

    const panel = buildPanel({
        ...SYUT_SETTING_PANEL_SCHEMA,
        fields
    });

    // 🛡️ Platinum Strategy: 安全な応答ロジック
    try {
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply(panel);
        } else if (interaction.isRepliable()) {
            // Ephemeral フラグは BaseCommand で制御されているため、ここでは指定しない
            await interaction.reply(panel);
        }
    } catch (err) {
        // 10062 / 40060 エラーは無視（既に処理済み）
        if (err.code !== 10062 && err.code !== 40060) {
            throw err;
        }
    }
}

/**
 * 運用打刻パネルを構築（共通）
 */
async function buildPunchPanel(guildId, storeName, type) {
    const attendance = await require('../SyutRepository').getDailyAttendance(guildId, storeName, require('dayjs')().format('YYYY-MM-DD'));
    const list = type === 'cast' ? attendance.cast : attendance.kurofuku;

    // 出勤中メンバー抽出
    const workingMembers = list
        .filter(m => m.status === 'working')
        .map(m => `・${m.userName} (<@${m.userId}>) [${m.punches.filter(p => p.action === 'in').pop()?.time || '-'}]`);

    const schema = SYUT_PUNCH_PANEL_SCHEMA(type, storeName);

    return buildPanel({
        ...schema,
        fields: [
            { name: schema.fields[0].name, value: workingMembers.length > 0 ? workingMembers.join('\n') : schema.fields[0].fallback }
        ]
    });
}

module.exports = { postSyutSettingPanel, buildPunchPanel };
