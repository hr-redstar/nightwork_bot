/**
 * src/modules/level/handlers/XpChatHandler.js
 */

const BaseInteractionHandler = require('../../../structures/BaseInteractionHandler');
const InteractionDTO = require('../../../utils/dto/InteractionDTO');
const service = require('../LevelService');
const ui = require('../../../utils/ui/ComponentFactory');

class XpChatHandler extends BaseInteractionHandler {
    shouldAutoDefer() { return false; }

    async handle(interaction) {
        const dto = new InteractionDTO(interaction);
        const config = await service.getConfig(dto.guildId);
        const xp = config.xp?.chat || {};

        const modal = ui.createModal({
            id: 'level:xp:chat:modal_submit',
            title: 'チャットXP設定',
            inputs: [
                {
                    id: 'xp_value',
                    label: '獲得XP量',
                    style: 1,
                    placeholder: '例: 5',
                    value: String(xp.xp || 5),
                    required: true
                },
                {
                    id: 'type',
                    label: '方式 (count: 1回ごと / length: 文字数ごと)',
                    style: 1,
                    placeholder: 'count または length',
                    value: xp.type || 'count',
                    required: true
                }
            ]
        });

        await interaction.showModal(modal);
    }
}

class XpChatSubmitHandler extends BaseInteractionHandler {
    async handle(interaction) {
        const dto = new InteractionDTO(interaction);
        const xpVal = parseInt(interaction.fields.getTextInputValue('xp_value'), 10);
        const type = interaction.fields.getTextInputValue('type');

        await service.updateXpConfig(dto.guildId, 'chat', {
            xp: isNaN(xpVal) ? 5 : xpVal,
            type: type === 'length' ? 'length' : 'count'
        });

        await interaction.reply({
            content: '✅ チャットXPルールを更新しました。',
            flags: 64
        });
    }
}

module.exports = {
    trigger: new XpChatHandler(),
    submit: new XpChatSubmitHandler()
};
