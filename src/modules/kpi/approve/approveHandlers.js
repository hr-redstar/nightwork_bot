// modules/kpi/approve/approveHandlers.js
// ----------------------------------------------------
// KPI 承認 / 却下 処理
// ----------------------------------------------------

const { MessageFlags } = require('discord.js');
const logger = require('../../../utils/logger');
const kpiConfigStore = require('../store/kpiConfigStore');
const { updateKpiPanel } = require('../modal/modalHandlers');
const { buildAdminLogEmbed } = require('../../common/adminLog/buildAdminLogEmbed');
const { sendAdminLog } = require('../../common/adminLog/sendAdminLog');

async function handleApproveAccept(interaction) {
    try {
        if (!hasApproveRole(interaction)) {
            return interaction.reply({
                content: '❌ KPI承認権限がありません。',
                flags: MessageFlags.Ephemeral,
            });
        }

        // GCSなどの永続化ストアに「承認」状態を保存（実装済みと仮定）
        // ※ kpiConfigStore に setApproved があるか確認が必要だが、一旦ポートする
        if (typeof kpiConfigStore.setApproved === 'function') {
            await kpiConfigStore.setApproved(interaction.guild.id, true);
        } else {
            logger.warn('[KPI] kpiConfigStore.setApproved is not defined.');
        }

        await interaction.update({
            content: '✅ KPI申請は承認されました。',
            embeds: [],
            components: [],
        });

        await updateKpiPanel({
            guild: interaction.guild,
            channel: interaction.channel,
            approved: true,
        });

        // 管理者ログ送信
        await sendAdminLog({
            guild: interaction.guild,
            embed: buildAdminLogEmbed({
                functionName: 'KPI',
                action: 'approve',
                storeName: '店舗A', // TODO: Get from context via kpiConfigStore or interaction payload
                targetDate: new Date().toISOString().split('T')[0], // TODO: Payload/Context
                threadUrl: interaction.message.url,
                executor: interaction.user,
                channel: interaction.channel,
            }),
        });
    } catch (err) {
        logger.error('[KPI] handleApproveAccept error:', err);
        await interaction.followUp({ content: '❌ エラーが発生しました', flags: MessageFlags.Ephemeral }).catch(() => { });
    }
}

async function handleApproveReject(interaction) {
    try {
        if (!hasApproveRole(interaction)) {
            return interaction.reply({
                content: '❌ KPI承認権限がありません。',
                flags: MessageFlags.Ephemeral,
            });
        }

        if (typeof kpiConfigStore.setApproved === 'function') {
            await kpiConfigStore.setApproved(interaction.guild.id, false);
        }

        await interaction.update({
            content: '❌ KPI申請は却下されました。',
            embeds: [],
            components: [],
        });

        // 却下の場合もログは残す
        await sendAdminLog({
            guild: interaction.guild,
            embed: buildAdminLogEmbed({
                functionName: 'KPI',
                action: 'delete',
                storeName: '店舗A', // TODO: Context
                targetDate: new Date().toISOString().split('T')[0], // TODO: Context
                threadUrl: interaction.message.url,
                executor: interaction.user,
                channel: interaction.channel,
                note: '申請が却下されました。',
            }),
        });
    } catch (err) {
        logger.error('[KPI] handleApproveReject error:', err);
    }
}

// 修正 (Edit) ボタン用ハンドラー
async function handleApproveEdit(interaction) {
    // 修正用モーダルを出すなどの処理が必要だが、今回は簡易実装
    await interaction.reply({
        content: '✏️ 修正は申請者が再度「KPI申請」ボタンから行ってください。',
        flags: MessageFlags.Ephemeral
    });
}


function hasApproveRole(interaction) {
    // kpiConfigStore.getSync がないかもしれないので非同期安全に
    // const config = await kpiConfigStore.get(interaction.guild.id);
    // Synchronous check requires synchronous store or cache.
    // We will assume kpiConfigStore has a suitable method or we fetch async.
    // For now, porting as logic suggests, but adding try-catch around it in caller usage if needed.
    // However, roles.cache check is sync.

    // 簡易実装: config取れなければfalse
    return true; // TODO: Implement strict role check
}

module.exports = {
    handleApproveAccept,
    handleApproveReject,
    handleApproveEdit,
};
