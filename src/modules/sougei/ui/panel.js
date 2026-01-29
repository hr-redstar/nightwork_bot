const { MessageFlags } = require('discord.js');
const { buildPanel } = require('../../../utils/ui/PanelBuilder');
const { SOUGEI_SETTING_PANEL_SCHEMA } = require('./panelSchema');
const service = require('../SougeiService');
const logger = require('../../../utils/logger');

/**
 * 送迎設定パネルを送信・更新
 */
async function postSougeiSettingPanel(interaction) {
    const guild = interaction.guild;
    const { config, storeRoleConfig } = await service.prepareSettingData(guild.id);

    // 送迎者役職の表示（共通メソッド活用）
    const roleMentions = service.resolveApproverMention(guild, storeRoleConfig, {
        approverPositionIds: config.sougeiRoleIds || []
    }) || '未設定';

    // メンバー一覧の生成
    const memberList = await service.getSougeiMemberText(guild, config.sougeiRoleIds);

    const dataMap = {
        roles: roleMentions,
        members: memberList,
    };

    const fields = SOUGEI_SETTING_PANEL_SCHEMA.fields.map(f => ({
        name: f.name,
        value: dataMap[f.key] || f.fallback
    }));

    const panel = buildPanel({
        title: SOUGEI_SETTING_PANEL_SCHEMA.title,
        description: SOUGEI_SETTING_PANEL_SCHEMA.description,
        color: SOUGEI_SETTING_PANEL_SCHEMA.color,
        fields: fields,
        buttons: SOUGEI_SETTING_PANEL_SCHEMA.buttons
    });

    if (interaction.deferred || interaction.replied) {
        await interaction.editReply(panel);
    } else {
        await interaction.reply({ ...panel, flags: MessageFlags.Ephemeral });
    }
}

module.exports = { postSougeiSettingPanel };
