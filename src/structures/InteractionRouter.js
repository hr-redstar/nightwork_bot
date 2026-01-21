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

        for (const { pattern, handler } of this.routes) {
            if (this._match(pattern, id)) {
                await handler(interaction);
                return true;
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
            return pattern(id);
        }
        return false;
    }
}

module.exports = InteractionRouter;
