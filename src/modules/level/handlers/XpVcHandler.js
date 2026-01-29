/**
 * src/modules/level/handlers/XpVcHandler.js
 */

const BaseInteractionHandler = require('../../../structures/BaseInteractionHandler');
const InteractionDTO = require('../../../utils/dto/InteractionDTO');
const service = require('../LevelService');
const ui = require('../../../utils/ui/ComponentFactory');

class XpVcHandler extends BaseInteractionHandler {
    shouldAutoDefer() { return false; }

    async handle(interaction) {
        const dto = new InteractionDTO(interaction);
        const config = await service.getConfig(dto.guildId);
        const vc = config.xp?.vc || {};

        const modal = ui.createModal({
            id: 'level:xp:vc:modal_submit',
            title: 'VC時間XP設定',
            inputs: [
                {
                    id: 'per_minute',
                    label: '1分あたりの獲得XP量',
                    style: 1,
                    placeholder: '例: 1',
                    value: String(vc.perMinute || 1),
                    required: true
                }
            ]
        });

        await interaction.showModal(modal);
    }
}

class XpVcSubmitHandler extends BaseInteractionHandler {
    async handle(interaction) {
        const dto = new InteractionDTO(interaction);
        const val = parseInt(interaction.fields.getTextInputValue('per_minute'), 10);

        await service.updateXpConfig(dto.guildId, 'vc', {
            perMinute: isNaN(val) ? 1 : val
        });

        await interaction.reply({
            content: '✅ VC時間XPルールを更新しました。',
            flags: 64
        });
    }
}

module.exports = {
    trigger: new XpVcHandler(),
    submit: new XpVcSubmitHandler()
};
