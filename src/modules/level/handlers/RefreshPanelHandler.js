/**
 * src/modules/level/handlers/RefreshPanelHandler.js
 */

const BaseInteractionHandler = require('../../../structures/BaseInteractionHandler');
const InteractionDTO = require('../../../utils/dto/InteractionDTO');
const { buildLevelPanel } = require('../ui/panel');

class RefreshPanelHandler extends BaseInteractionHandler {
    async handle(interaction) {
        const dto = new InteractionDTO(interaction);
        const panel = await buildLevelPanel(dto.guildId);
        await this.safeReply(interaction, panel);
    }
}

module.exports = new RefreshPanelHandler();
