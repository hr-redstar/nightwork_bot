/**
 * src/structures/BaseHandler.js
 * インタラクションハンドラーの基底クラス
 */

const { handleInteractionError } = require('../utils/errorHandlers');
const logger = require('../utils/logger');

class BaseHandler {
    constructor(client) {
        this.client = client;
    }

    /**
     * メインの実行メソッド
     * @param {import('discord.js').Interaction} interaction 
     */
    async execute(interaction) {
        try {
            await this.handle(interaction);
        } catch (err) {
            await handleInteractionError(interaction, err);
        }
    }

    /**
     * 各ハンドラーで実装する具象メソッド
     * @param {import('discord.js').Interaction} interaction 
     */
    async handle(interaction) {
        throw new Error('handle() must be implemented');
    }

    /**
     * 操作権限チェック (共通)
     */
    checkPermission(interaction, roleId) {
        if (!interaction.member.roles.cache.has(roleId)) {
            throw new Error('この操作を実行する権限がありません。');
        }
    }
}

module.exports = BaseHandler;
