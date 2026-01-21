// modules/kuzibiki/setting/settingActions.js
// ----------------------------------------------------
// くじ引き 設定アクション処理
// ----------------------------------------------------

const {
    ActionRowBuilder,
    ChannelSelectMenuBuilder,
    RoleSelectMenuBuilder,
    ChannelType,
    MessageFlags,
} = require('discord.js');

const logger = require('../../../utils/logger');
const { readKujiConfig, saveKujiConfig } = require('../../../utils/kuzibiki/kuzibikiStorage');
// Note: We need to update storage to support object merging or just use a new one.
// For now, I'll update the local storage function calls to be more robust if I can.

async function handleKuzibikiSetting(interaction, subAction) {
    try {
        if (subAction === 'install') {
            const row = new ActionRowBuilder().addComponents(
                new ChannelSelectMenuBuilder()
                    .setCustomId('kuzibiki:setup:channel')
                    .setPlaceholder('くじ引きパネルを設置するチャンネルを選択')
                    .addChannelTypes(ChannelType.GuildText)
            );

            return await interaction.reply({
                content: '🎰 くじ引きパネルを設置するチャンネルを選択してください。',
                components: [row],
                flags: MessageFlags.Ephemeral,
            });
        }

        if (subAction === 'approveRole') {
            const row = new ActionRowBuilder().addComponents(
                new RoleSelectMenuBuilder()
                    .setCustomId('kuzibiki:setup:role')
                    .setPlaceholder('くじ引き承認役職を選択')
            );

            return await interaction.reply({
                content: '🎰 くじ引きの承認権限を持つ役職を選択してください。',
                components: [row],
                flags: MessageFlags.Ephemeral,
            });
        }
    } catch (err) {
        logger.error('[Kuzibiki] handleKuzibikiSetting error:', err);
    }
}

async function handleKuzibikiSetup(interaction, subAction) {
    try {
        const guildId = interaction.guild.id;
        const config = await readKujiConfig(guildId);

        if (subAction === 'channel') {
            const channelId = interaction.values[0];
            const channel = interaction.guild.channels.cache.get(channelId);

            // パネルを設置
            const { upsertKuzibikiPanel } = require('../execute/lotteryPanel');
            await upsertKuzibikiPanel(channel);

            // 設定をマージ保存 (TODO: merge support)
            config.panelChannelId = channelId;
            await saveKujiConfigMerged(guildId, config);

            return await interaction.reply({
                content: `✅ <#${channelId}> にくじ引きパネルを設置しました。`,
                flags: MessageFlags.Ephemeral,
            });
        }

        if (subAction === 'role') {
            const roleId = interaction.values[0];

            config.approveRoleId = roleId;
            await saveKujiConfigMerged(guildId, config);

            return await interaction.reply({
                content: `✅ 承認役職を <@&${roleId}> に設定しました。`,
                flags: MessageFlags.Ephemeral,
            });
        }
    } catch (err) {
        logger.error('[Kuzibiki] handleKuzibikiSetup error:', err);
    }
}

// ====================================================
// モーダル表示 (kuzibiki:execute:config)
// ====================================================
async function openConfigModal(interaction) {
    const { ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
    const guildId = interaction.guild.id;
    const config = await readKujiConfig(guildId);
    const initialText = (config.settings || []).join('\n');

    const modal = new ModalBuilder()
        .setCustomId('kuzibiki:modal:config')
        .setTitle('くじ引き内容編集（改行で複数）');

    const textarea = new TextInputBuilder()
        .setCustomId('settings')
        .setLabel('くじ引きの選択肢を1行ずつ入力')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setValue(initialText);

    modal.addComponents(new ActionRowBuilder().addComponents(textarea));
    await interaction.showModal(modal);
}

// ====================================================
// モーダル処理 (kuzibiki:modal:*)
// ====================================================
async function handleKuzibikiModal(interaction, subAction) {
    try {
        const guildId = interaction.guild.id;
        const config = await readKujiConfig(guildId);

        if (subAction === 'config') {
            const raw = interaction.fields.getTextInputValue('settings') || '';
            const lines = raw
                .split('\n')
                .map(s => s.trim())
                .filter(Boolean);

            config.settings = lines;
            await saveKujiConfigMerged(guildId, config);

            // パネル更新
            if (config.panelChannelId) {
                const channel = interaction.guild.channels.cache.get(config.panelChannelId);
                if (channel) {
                    const { upsertKuzibikiPanel } = require('../execute/lotteryPanel');
                    await upsertKuzibikiPanel(channel);
                }
            }

            return await interaction.reply({
                content: `✅ くじ引き内容を更新しました（${lines.length} 件）。`,
                flags: MessageFlags.Ephemeral,
            });
        }
    } catch (err) {
        logger.error('[Kuzibiki] handleKuzibikiModal error:', err);
    }
}

// Helper to save merged config until storage is updated
async function saveKujiConfigMerged(guildId, config) {
    const path = require('path');
    const { safeSaveJSON } = require('../../../utils/fileUtils');
    const baseDir = path.join(__dirname, '../../../../local_data/GCS');
    const filePath = path.join(baseDir, guildId, 'くじ引き', 'config.json');

    config.updatedAt = new Date().toISOString();
    safeSaveJSON(filePath, config);
}

module.exports = {
    handleKuzibikiSetting,
    handleKuzibikiSetup,
    openConfigModal,
    handleKuzibikiModal,
};
