/**
 * src/structures/AppRouter.js
 * アプリケーション全体のインタラクションルーティングを管理
 * モジュールディレクトリをスキャンし、自動的にルーティングを構築する
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const InteractionRouter = require('./InteractionRouter');

class AppRouter {
    constructor() {
        // [ { prefixes: string[], handler: Function, name: string } ]
        this.modules = [];
    }

    /**
     * モジュールディレクトリをスキャンしてロード
     * @param {string} modulesDir 
     */
    loadModules(modulesDir) {
        if (this.modulesInitialized) return;
        this.modulesInitialized = true;

        if (!fs.existsSync(modulesDir)) {
            logger.warn(`[AppRouter] Modules directory not found: ${modulesDir}`);
            return;
        }

        const entries = fs.readdirSync(modulesDir, { withFileTypes: true });

        for (const entry of entries) {
            if (!entry.isDirectory()) continue;

            const modulePath = path.join(modulesDir, entry.name);
            const indexPath = path.join(modulePath, 'index.js');

            if (fs.existsSync(indexPath)) {
                try {
                    const moduleDef = require(indexPath);
                    this.registerModule(entry.name, moduleDef);
                } catch (err) {
                    logger.error(`[AppRouter] Failed to load module "${entry.name}":`, err);
                }
            }
        }
    }

    /**
     * モジュールを登録
     * @param {string} name 
     * @param {object} moduleDef 
     */
    registerModule(name, moduleDef) {
        // 新規格: prefixes と router または handler がエクスポートされている
        if (moduleDef.prefixes && (moduleDef.router || moduleDef.handleInteraction || moduleDef.handler)) {
            const handler = moduleDef.router
                ? (i) => moduleDef.router.dispatch(i)
                : (moduleDef.handleInteraction || moduleDef.handler);

            this.modules.push({
                name: name,
                prefixes: Array.isArray(moduleDef.prefixes) ? moduleDef.prefixes : [moduleDef.prefixes],
                handler: handler
            });
            logger.silly(`[AppRouter] Registered module: [${name}] prefixes=[${moduleDef.prefixes.join(', ')}]`);
            return;
        }

        // 旧規格への対応はここか、あるいはLegacy Adapterで行うが、
        // 将来的にはindex.jsを修正してもらう方針。
        // ここでは警告を出すだけに留めるか、簡易的に推測する。
        logger.silly(`[AppRouter] Skipped "${name}" (No prefixes defined in index.js)`);
    }

    /**
     * レガシーなInteractionRegistryからの移行用
     * @param {object} registry 
     */
    loadFromLegacyRegistry(registry) {
        for (const [prefix, handler] of Object.entries(registry)) {
            this.modules.push({
                name: `legacy_${prefix}`,
                prefixes: [prefix],
                handler: handler
            });
        }
        logger.silly(`[AppRouter] Loaded ${Object.keys(registry).length} legacy routes`);
    }

    /**
     * メインのディスパッチ処理
     * @param {import('discord.js').Interaction} interaction 
     */
    async dispatch(interaction) {
        if (!interaction.customId) return false;
        const customId = interaction.customId;

        // prefixマッチで検索
        // 登録順序（あるいはソート順）に依存するが、
        // 基本的には longest match が望ましい。
        // ここでは一旦単純ループで、複数マッチは考慮しない（最初のマッチ優先）

        for (const mod of this.modules) {
            if (interaction.replied || interaction.deferred) break; // すでに前のモジュールで応答済みなら終了

            for (const prefix of mod.prefixes) {
                // 完全一致 または "prefix:" または "prefix_"
                if (customId === prefix || customId.startsWith(prefix + ':') || customId.startsWith(prefix + '_')) {
                    if (typeof mod.handler !== 'function') {
                        logger.error(`[AppRouter] Handler for ${mod.name} is not a function! (prefix: ${prefix})`);
                        continue;
                    }
                    logger.debug(`[AppRouter] Dispatching to module: ${mod.name} (prefix match: ${prefix})`);
                    try {
                        await mod.handler(interaction);
                        // ハンドラー内で interaction.replied/deferred が true になったかチェック
                        if (interaction.replied || interaction.deferred) {
                            return true;
                        }
                    } catch (err) {
                        // エラーは上位の interactionCreate でキャッチさせる
                        throw err;
                    }
                }
            }
        }

        return false;
    }
}

module.exports = new AppRouter();
