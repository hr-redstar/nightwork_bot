const { handleInteractionError } = require('../utils/errorHandlers');

class BaseCommand {
    constructor({ ephemeral = true, defer = false } = {}) {
        this.ephemeral = ephemeral;
        this.defer = defer;
    }

    async execute(interaction) {
        try {
            if (this.defer) {
                await interaction.deferReply({ ephemeral: this.ephemeral });
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
