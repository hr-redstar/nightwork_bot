// @ts-check
/**
 * src/modules/keihi/setting/handlers/SetApproverHandler.js
 * 「承認役職」ボタン押下ハンドラー
 */

const BaseInteractionHandler = require('../../../../structures/BaseInteractionHandler');
const { loadKeihiConfig } = require('../../../../utils/keihi/keihiConfigManager');
const { loadStoreRoleConfig } = require('../../../../utils/config/storeRoleConfigManager');
const { IDS } = require('../ids');
const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

class SetApproverHandler extends BaseInteractionHandler {
    /**
     * @param {import('discord.js').ButtonInteraction} interaction
     * @returns {Promise<void>}
     */
    async handle(interaction) {
        const guild = interaction.guild;
        if (!guild) return;
        const guildId = guild.id;

        const keihiConfig = await loadKeihiConfig(guildId);
        const storeRoleConfig = await loadStoreRoleConfig(guildId).catch(() => null);

        // @ts-ignore
        const rawRoles = storeRoleConfig?.roles ?? storeRoleConfig?.positions ?? [];
        /** @type {{ id: string, name: string }[]} */
        let positions = [];

        if (Array.isArray(rawRoles)) {
            positions = rawRoles.map((r, index) => {
                if (typeof r === 'string') return { id: String(index), name: r };
                const id = r.id ?? r.positionId ?? index;
                const name = r.name ?? r.label ?? `役職${id}`;
                return { id: String(id), name: String(name) };
            });
        } else if (rawRoles && typeof rawRoles === 'object') {
            positions = Object.entries(rawRoles).map(([id, info]) => {
                const name = info?.name ?? info?.label ?? guild.roles.cache.get(info?.roleId || id)?.name ?? `役職(${id})`;
                return { id: String(id), name: String(name) };
            });
        }

        if (!positions.length) {
            await interaction.editReply({
                content: '登録されている役職がありません。先に `/設定` コマンドで役職とロールの紐付けを行ってください。',
                components: [],
            });
            return;
        }

        const currentApproverPositionIds = keihiConfig.approverPositionIds || [];
        const options = positions.map((p) => ({
            label: p.name,
            value: p.id,
            default: currentApproverPositionIds.includes(p.id),
        }));

        const select = new StringSelectMenuBuilder()
            .setCustomId(IDS.SEL_APPROVER_ROLES)
            .setPlaceholder('経費の承認を行う役職を選択（複数可）')
            .setMinValues(0)
            .setMaxValues(options.length)
            .addOptions(options);

        const row = new ActionRowBuilder().addComponents(select);

        await interaction.editReply({
            content: '経費承認役職を選択してください。',
            // @ts-ignore
            components: [row],
        });
    }
}

module.exports = new SetApproverHandler();
