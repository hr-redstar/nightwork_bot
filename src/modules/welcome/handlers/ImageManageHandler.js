/**
 * src/modules/welcome/handlers/ImageManageHandler.js
 */

const BaseInteractionHandler = require('../../../structures/BaseInteractionHandler');
const InteractionDTO = require('../../../utils/dto/InteractionDTO');
const service = require('../WelcomeService');
const ui = require('../../../utils/ui/ComponentFactory');

class ImageAddHandler extends BaseInteractionHandler {
    shouldAutoDefer() { return false; }

    async handle(interaction) {
        const modal = ui.createModal({
            id: 'welcome:image:add_submit',
            title: '画像追加',
            inputs: [
                {
                    id: 'image_url',
                    label: '画像URL',
                    style: 1,
                    placeholder: 'https://...',
                    required: true
                }
            ]
        });

        await interaction.showModal(modal);
    }
}

class ImageAddSubmitHandler extends BaseInteractionHandler {
    async handle(interaction) {
        const dto = new InteractionDTO(interaction);
        const url = interaction.fields.getTextInputValue('image_url');

        // 簡易URLバリデーション
        if (!url.startsWith('http')) {
            return await interaction.reply({ content: '⚠️ 有効なURLを入力してください。', flags: 64 });
        }

        const config = await service.getConfig(dto.guildId);
        const images = config.randomImage?.images || [];

        if (!images.includes(url)) {
            images.push(url);
            await service.updateRandomImage(dto.guildId, { images });
        }

        await interaction.reply({
            content: '✅ 画像を追加しました。',
            flags: 64
        });
    }
}

module.exports = {
    trigger: new ImageAddHandler(),
    submit: new ImageAddSubmitHandler()
};
