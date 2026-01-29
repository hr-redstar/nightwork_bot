/**
 * src/modules/welcome/handlers/SetChannelHandler.js
 */

const BaseInteractionHandler = require('../../../structures/BaseInteractionHandler');
const InteractionDTO = require('../../../utils/dto/InteractionDTO');
const { showStoreSelectForPanel } = require('../../../events/panelFlowHelper');
const { buildWelcomePanel } = require('../ui/panel');
const service = require('../WelcomeService');
const { ActionRowBuilder, ChannelSelectMenuBuilder, ChannelType, MessageFlags } = require('discord.js');

class SetChannelHandler extends BaseInteractionHandler {
    // チャンネル選択は通常一回返して終わりなので defer しない方がスムーズな場合もあるが、
    // ここでは新しい構成に合わせて deferReply (Ephemeral) を利用する。

    async handle(interaction) {
        const select = new ChannelSelectMenuBuilder()
            .setCustomId('welcome:channel:select_menu')
            .setPlaceholder('挨拶を投稿するチャンネルを選択してください')
            .addChannelTypes(ChannelType.GuildText);

        const row = new ActionRowBuilder().addComponents(select);

        await this.safeReply(interaction, {
            content: '📢 ウェルカム挨拶を送信するテキストチャンネルを選択してください。',
            components: [row],
            flags: MessageFlags.Ephemeral
        });
    }
}

/**
 * セレクトメニュー選択後の処理用ハンドラー（内部クラス的な扱い、または別ファイル）
 */
class SetChannelSubmitHandler extends BaseInteractionHandler {
    async handle(interaction) {
        const dto = new InteractionDTO(interaction);
        const { guildId } = dto.getContext();
        const channelId = interaction.values[0];

        await service.updateChannel(guildId, channelId);

        // パネル更新
        const panel = await buildWelcomePanel(guildId);

        // 元のメッセージ（選択メニュー）を消す、または更新する
        await interaction.update({
            content: `✅ 挨拶チャンネルを <#${channelId}> に設定しました。`,
            components: []
        });

        // 管理者ログ送信などの処理をここに追加可能
    }
}

module.exports = {
    trigger: new SetChannelHandler(),
    submit: new SetChannelSubmitHandler()
};
