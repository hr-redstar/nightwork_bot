// @ts-check
/**
 * src/modules/keihi/request/handlers/RequestStartHandler.js
 * 経費申請開始 (店舗選択後のボタン押下)
 */

const BaseInteractionHandler = require('../../../../structures/BaseInteractionHandler');
const { loadStoreRoleConfig } = require('../../../../utils/config/storeRoleConfigManager');
const { loadKeihiConfig, loadKeihiStoreConfig } = require('../../../../utils/keihi/keihiConfigManager');
const { collectAllowedRoleIdsForRequest } = require('../helpers');
const { resolveStoreName } = require('../../setting/storeNameResolver');
const { IDS: REQ_IDS } = require('../requestIds');
const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

class RequestStartHandler extends BaseInteractionHandler {
    /**
     * @param {import('discord.js').ButtonInteraction} interaction
     * @param {string} storeKey - 正規表現等で抽出された店舗名/ID
     * @returns {Promise<void>}
     */
    // @ts-ignore
    async handle(interaction, storeKey) {
        const { guild, member } = interaction;
        if (!guild || !member) return;

        const guildId = guild.id;

        const storeRoleConfig = await loadStoreRoleConfig(guildId).catch(() => null);

        const [keihiConfig, storeConfig] = await Promise.all([
            loadKeihiConfig(guildId),
            loadKeihiStoreConfig(guildId, storeKey, storeRoleConfig).catch(() => null),
        ]);

        const panelConfig = keihiConfig.panels?.[storeKey] || {};

        if (!panelConfig?.channelId) {
            await interaction.editReply({
                content: 'この店舗の経費申請パネル設定が見つかりません。',
                components: [],
            });
            return;
        }

        const { allowedRoleIds } = collectAllowedRoleIdsForRequest(
            keihiConfig,
            storeKey,
            storeRoleConfig,
        );

        // @ts-ignore
        const memberRoleIds = new Set(member.roles.cache.keys());
        const hasPermission = allowedRoleIds.length > 0 && allowedRoleIds.some((id) => memberRoleIds.has(id));

        if (!hasPermission) {
            await interaction.editReply({
                content: 'この店舗で経費申請を行う権限がありません。\nスレッド閲覧役職 / 申請役職 / 承認役職、または設定された申請用ロールのいずれかを付与してください。',
                components: [],
            });
            return;
        }

        const items = Array.isArray(panelConfig.items) && panelConfig.items.length
            ? panelConfig.items
            : (storeConfig && Array.isArray(storeConfig.items) ? storeConfig.items : []);

        if (!items.length) {
            await interaction.editReply({
                content: '経費項目が未設定です。先に「経費項目登録」から項目を登録してください。',
                components: [],
            });
            return;
        }

        const select = new StringSelectMenuBuilder()
            .setCustomId(`${REQ_IDS.REQUEST_ITEM_SELECT}::${storeKey}`)
            .setPlaceholder('申請する経費項目を選択')
            .setMinValues(1)
            .setMaxValues(1);

        for (const item of items) {
            let label = typeof item === 'string' ? item : (item?.name || String(item));
            const safe = label.slice(0, 100);
            select.addOptions({ label: safe, value: safe });
        }

        await interaction.editReply({
            content: '経費項目を選択してください。',
            // @ts-ignore
            components: [new ActionRowBuilder().addComponents(select)],
        });

        // 自動削除タイマーなどは必要に応じてここに残す
        this._setupAutoDelete(interaction);
    }

    _setupAutoDelete(interaction) {
        const AUTO_DELETE_MS = 14 * 60 * 1000;
        setTimeout(async () => {
            try {
                if (interaction.deferred || interaction.replied) {
                    await interaction.deleteReply();
                }
            } catch { /* ignore */ }
        }, AUTO_DELETE_MS);
    }
}

module.exports = new RequestStartHandler();
