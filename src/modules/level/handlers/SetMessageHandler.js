/**
 * src/modules/level/handlers/SetMessageHandler.js
 */

const BaseInteractionHandler = require('../../../structures/BaseInteractionHandler');
const InteractionDTO = require('../../../utils/dto/InteractionDTO');
const service = require('../LevelService');
const ui = require('../../../utils/ui/ComponentFactory');

class SetMessageHandler extends BaseInteractionHandler {
    shouldAutoDefer() { return false; }

    async handle(interaction) {
        const dto = new InteractionDTO(interaction);
        const config = await service.getConfig(dto.guildId);

        const modal = ui.createModal({
            id: 'level:message:modal_submit',
            title: 'レベルアップメッセージ改変',
            inputs: [
                {
                    id: 'message_text',
                    label: 'メッセージテンプレート',
                    style: 2,
                    placeholder: '例: {user} さんのレベルが {level} に上がりました！',
                    value: config.message || '',
                    required: true,
                    maxLength: 1000
                }
            ]
        });

        await interaction.showModal(modal);
    }
}

class SetMessageSubmitHandler extends BaseInteractionHandler {
    async handle(interaction) {
        const dto = new InteractionDTO(interaction);
        const message = interaction.fields.getTextInputValue('message_text');
        await service.updateMessage(dto.guildId, message);

        await interaction.reply({
            content: '✅ レベルアップメッセージを更新しました。',
            flags: 64
        });
    }
}

module.exports = {
    trigger: new SetMessageHandler(),
    submit: new SetMessageSubmitHandler()
};
