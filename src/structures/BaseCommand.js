const { MessageFlags } = require('discord.js');
const { handleInteractionError } = require('../utils/errorHandlers');
const logger = require('../utils/logger');

class BaseCommand {
    constructor({ ephemeral = true, defer = false } = {}) {
        this.ephemeral = ephemeral;
        this.defer = defer;
    }

    async execute(interaction) {
        try {
            // --- 究極の応答ガード: 既に応答済みならスキップ ---
            if (interaction.deferred || interaction.replied) {
                logger.debug(`[BaseCommand] Interaction already acknowledged. Skipping auto-defer.`);
                await this.run(interaction);
                return;
            }

            // --- 自動承認 (defer) ---
            if (this.defer) {
                try {
                    logger.debug(`[BaseCommand] Attempting deferReply...`);
                    const deferOptions = this.ephemeral ? { flags: MessageFlags.Ephemeral } : {};
                    await interaction.deferReply(deferOptions);
                } catch (err) {
                    if (err.code === 40060 || err.code === 10062) {
                        logger.warn(`[BaseCommand] deferReply ignored (already acknowledged): code=${err.code}`);
                        // 🛡️ CRITICAL: 下流のコードが editReply を使えるように内部フラグを立てる
                        interaction.deferred = true;
                    } else {
                        throw err;
                    }
                }
            }

            await this.run(interaction);
        } catch (error) {
            await handleInteractionError(interaction, error);
        }
    }

    // 各コマンドで実装
    async run() {
        throw new Error('run() not implemented');
    }
}

module.exports = BaseCommand;
