/**
 * src/events/voiceStateUpdate.js
 * VCの入退室を検知してXP計算を行う
 */

const { Events } = require('discord.js');
const levelService = require('../modules/level/LevelService');

module.exports = {
    name: Events.VoiceStateUpdate,

    async execute(oldState, newState) {
        // levelService に処理を委譲
        await levelService.handleVoiceStateUpdate(oldState, newState);
    }
};
