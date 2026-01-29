/**
 * src/utils/dto/InteractionDTO.js
 * Discord インタラクションから必要な情報だけを抽出する DTO
 */

const BaseDTO = require('./BaseDTO');

class InteractionDTO extends BaseDTO {
    /**
     * @param {import('discord.js').Interaction} interaction 
     */
    constructor(interaction) {
        super();
        this.guildId = interaction.guildId;
        this.guildName = interaction.guild?.name;
        this.userId = interaction.user?.id;
        this.userName = interaction.user?.username;
        this.channelId = interaction.channelId;
        this.customId = interaction.customId;

        // メンバー情報
        this.memberRoleIds = Array.from(interaction.member?.roles?.cache?.keys() || []);
        this.isAdmin = interaction.member?.permissions?.has('Administrator') || false;
    }

    /**
     * Service層へ渡すためのクリーンなコンテキストオブジェクト
     */
    getContext() {
        return {
            guildId: this.guildId,
            userId: this.userId,
            userName: this.userName,
            channelId: this.channelId,
            memberRoleIds: this.memberRoleIds,
            isAdmin: this.isAdmin
        };
    }
}

module.exports = InteractionDTO;
