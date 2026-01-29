/**
 * src/events/guildMemberAdd.js
 * 新規メンバー参加時の処理
 */

const { Events, EmbedBuilder } = require('discord.js');
const welcomeService = require('../modules/welcome/WelcomeService');
const logger = require('../utils/logger');

module.exports = {
    name: Events.GuildMemberAdd,

    async execute(member) {
        const guildId = member.guild.id;

        try {
            const config = await welcomeService.getConfig(guildId);
            if (!config || !config.channelId) return;

            const channel = await member.guild.channels.fetch(config.channelId).catch(() => null);
            if (!channel || !channel.isTextBased()) return;

            // メッセージ生成
            const text = welcomeService.formatMessage(config.message, member);

            // 画像
            const imageUrl = welcomeService.pickRandomImage(config);

            const embed = new EmbedBuilder()
                .setDescription(text)
                .setColor('#00b894')
                .setTimestamp();

            if (imageUrl) {
                embed.setImage(imageUrl);
            }

            await channel.send({
                content: `${member}`,
                embeds: [embed]
            }).catch(err => {
                logger.error(`[Welcome] Failed to send greeting to ${channel.name}:`, err);
            });

        } catch (err) {
            logger.error(`[Welcome] Error in guildMemberAdd:`, err);
        }
    }
};
