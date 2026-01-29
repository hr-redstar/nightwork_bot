/**
 * src/modules/welcome/handlers/ImageMenuHandler.js
 */

const BaseInteractionHandler = require('../../../structures/BaseInteractionHandler');
const InteractionDTO = require('../../../utils/dto/InteractionDTO');
const service = require('../WelcomeService');
const ui = require('../../../utils/ui/ComponentFactory');
const { buildWelcomePanel } = require('../ui/panel');
const { ButtonStyle } = require('discord.js');

class ImageMenuHandler extends BaseInteractionHandler {
    async handle(interaction) {
        const dto = new InteractionDTO(interaction);
        const config = await service.getConfig(dto.guildId);

        // サブメニューパネルの構築
        const isEnabled = config.randomImage?.enabled;
        const toggleLabel = isEnabled ? 'ランダム画像をOFFにする' : 'ランダム画像をONにする';
        const toggleStyle = isEnabled ? ButtonStyle.Danger : ButtonStyle.Success;

        const buttons = [
            ui.createButton({ id: 'welcome:image:toggle', label: toggleLabel, style: toggleStyle }),
            ui.createButton({ id: 'welcome:image:add', label: '画像を追加', style: ButtonStyle.Primary }),
            ui.createButton({ id: 'welcome:panel:refresh', label: '戻る', style: ButtonStyle.Secondary })
        ];

        let content = '🖼️ **ランダム画像設定**\n参加時にランダムで画像を表示します。';
        if (config.randomImage?.images?.length > 0) {
            content += `\n\n登録済み画像 (${config.randomImage.images.length}枚):`;
            config.randomImage.images.forEach((url, i) => {
                content += `\n${i + 1}. ${url}`;
            });
        } else {
            content += '\n\n現在、登録されている画像はありません。';
        }

        let components = ui.splitButtonsToRows(buttons);

        if (config.randomImage?.images?.length > 0) {
            const deleteSelect = ui.createSelect({
                id: 'welcome:image:delete_select',
                placeholder: '削除する画像を選択してください',
                options: config.randomImage.images.slice(0, 25).map((url, i) => ({
                    label: `画像 ${i + 1}`,
                    description: url.substring(0, 50),
                    value: String(i)
                }))
            });
            components.push(new ActionRowBuilder().addComponents(deleteSelect));
        }

        await this.safeReply(interaction, {
            content,
            components,
            flags: 64 // Ephemeral
        });
    }
}

const { ActionRowBuilder } = require('discord.js');

class ImageDeleteSubmitHandler extends BaseInteractionHandler {
    async handle(interaction) {
        const dto = new InteractionDTO(interaction);
        const index = parseInt(interaction.values[0], 10);
        const config = await service.getConfig(dto.guildId);
        const images = config.randomImage?.images || [];

        if (index >= 0 && index < images.length) {
            images.splice(index, 1);
            await service.updateRandomImage(dto.guildId, { images });
        }

        // メニュー再表示
        const menu = new ImageMenuHandler();
        await menu.handle(interaction);
    }
}

class ImageToggleHandler extends BaseInteractionHandler {
    async handle(interaction) {
        const dto = new InteractionDTO(interaction);
        const config = await service.getConfig(dto.guildId);
        const newState = !config.randomImage?.enabled;

        await service.updateRandomImage(dto.guildId, { enabled: newState });

        // 元のメニューを再描画
        const menu = new ImageMenuHandler();
        await menu.handle(interaction);
    }
}

module.exports = {
    trigger: new ImageMenuHandler(),
    toggle: new ImageToggleHandler(),
    delete: new ImageDeleteSubmitHandler()
};
