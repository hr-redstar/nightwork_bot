/**
 * src/modules/welcome/handlers/SetMessageHandler.js
 */

const BaseInteractionHandler = require('../../../structures/BaseInteractionHandler');
const InteractionDTO = require('../../../utils/dto/InteractionDTO');
const service = require('../WelcomeService');
const ui = require('../../../utils/ui/ComponentFactory');
const { buildWelcomePanel } = require('../ui/panel');

class SetMessageHandler extends BaseInteractionHandler {
    // モーダルを表示するため defer は禁止
    shouldAutoDefer() { return false; }

    async handle(interaction) {
        const dto = new InteractionDTO(interaction);
        const config = await service.getConfig(dto.guildId);

        const modal = ui.createModal({
            id: 'welcome:message:modal_submit',
            title: '挨拶メッセージ設定',
            inputs: [
                {
                    id: 'message_text',
                    label: 'メッセージテンプレート',
                    style: 2, // Paragraph
                    placeholder: '例: {user} さん、サーバーへようこそ！',
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
            content: '✅ 挨拶メッセージを更新しました。',
            flags: 64 // Ephemeral
        });
    }
}

module.exports = {
    trigger: new SetMessageHandler(),
    submit: new SetMessageSubmitHandler()
};
