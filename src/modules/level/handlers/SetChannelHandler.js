/**
 * src/modules/level/handlers/SetChannelHandler.js
 */

const BaseInteractionHandler = require('../../../structures/BaseInteractionHandler');
const InteractionDTO = require('../../../utils/dto/InteractionDTO');
const { buildLevelPanel } = require('../ui/panel');
const service = require('../LevelService');
const { ActionRowBuilder, ChannelSelectMenuBuilder, ChannelType, MessageFlags } = require('discord.js');

class SetChannelHandler extends BaseInteractionHandler {
    async handle(interaction) {
        const select = new ChannelSelectMenuBuilder()
            .setCustomId('level:channel:select_menu')
            .setPlaceholder('通知先チャンネルを選択してください')
            .addChannelTypes(ChannelType.GuildText);

        const row = new ActionRowBuilder().addComponents(select);

        await this.safeReply(interaction, {
            content: '📢 レベルアップ通知を送信するテキストチャンネルを選択してください。',
            components: [row],
            flags: MessageFlags.Ephemeral
        });
    }
}

class SetChannelSubmitHandler extends BaseInteractionHandler {
    async handle(interaction) {
        const dto = new InteractionDTO(interaction);
        const channelId = interaction.values[0];
        await service.updateChannel(dto.guildId, channelId);

        await interaction.update({
            content: `✅ 通知先を <#${channelId}> に設定しました。`,
            components: []
        });
    }
}

module.exports = {
    trigger: new SetChannelHandler(),
    submit: new SetChannelSubmitHandler()
};
