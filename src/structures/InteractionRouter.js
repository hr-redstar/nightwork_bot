const logger = require('../utils/logger');
const { isCustomId } = require('../utils/customId');

/**
 * Interaction Router
 * if-else 分岐を排除し、登録ベースでインタラクションを振り分ける
 */
class InteractionRouter {
    constructor() {
        this.routes = [];
    }

    /**
     * ハンドラ登録
     * @param {string|RegExp|Function} pattern - マッチ条件
     * @param {Function} handler - 実行関数 (interaction) => Promise<void>
     */
    on(pattern, handler) {
        this.routes.push({ pattern, handler });
        return this; // chainable
    }

    /**
     * インタラクションを実行
     * @param {Interaction} interaction
     * @returns {Promise<boolean>} 処理された場合 true
     */
    async dispatch(interaction) {
        if (!interaction.customId) return false;
        const id = interaction.customId;

        for (let i = 0; i < this.routes.length; i++) {
            const { pattern, handler } = this.routes[i];
            if (this._match(pattern, id)) {
                logger.debug(`[InteractionRouter] Matched route #${i} (pattern: ${pattern}) for ID: ${id}`);
                try {
                    if (typeof handler.execute === 'function') {
                        await handler.execute(interaction);
                    } else {
                        await handler(interaction);
                    }
                    return true;
                } catch (err) {
                    // Rethrow to let the module index handler catch it
                    throw err;
                }
            }
        }
        return false;
    }

    _match(pattern, id) {
        // 文字列完全一致
        if (typeof pattern === 'string') {
            // ワイルドカードサポート ('*' または 'prefix:*')
            if (pattern === '*') return true;
            if (pattern.endsWith(':*')) {
                const prefix = pattern.slice(0, -2);
                return id.startsWith(prefix + ':');
            }
            return id === pattern;
        }
        // 正規表現
        if (pattern instanceof RegExp) {
            return pattern.test(id);
        }
        // 関数判定
        if (typeof pattern === 'function') {
            try {
                return pattern(id);
            } catch (err) {
                logger.error('[InteractionRouter] Match function error:', err);
                return false;
            }
        }
        return false;
    }
}

module.exports = InteractionRouter;
