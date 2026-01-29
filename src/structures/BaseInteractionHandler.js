/**
 * src/structures/BaseInteractionHandler.js
 * インタラクションハンドラーの基底クラス
 * -----------------------------------------
 * - 3秒ルールの自動保証 (deferReply)
 * - 二重応答防止
 * - 統一エラーハンドリング
 * - 実行時間計測
 */

const logger = require('../utils/logger');
const { MessageFlags } = require('discord.js');
const { handleInteractionError } = require('../utils/errorHandlers');

class BaseInteractionHandler {
    /**
     * エントリーポイント: Router から呼ばれる
     * @param {import('discord.js').Interaction} interaction
     * @param {...any} args - 各ハンドラーへの追加引数 (param等)
     */
    async execute(interaction, ...args) {
        const start = Date.now();

        try {
            // 🔒 3秒ルールの自動保証
            if (this.shouldAutoDefer(interaction)) {
                if (!interaction.deferred && !interaction.replied) {
                    await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(err => {
                        logger.warn(`[BaseHandler] Failed to auto-defer: ${err.message}`);
                    });
                }
            }

            // メインロジックの実行
            await this.handle(interaction, ...args);

        } catch (err) {
            // 統一エラー処理
            await this.handleError(interaction, err);
        } finally {
            // 実行時間計測
            const ms = Date.now() - start;
            if (ms > 2500) {
                logger.warn(`[InteractionSlow] ${interaction.customId || 'unknown'} took ${ms}ms`);
            }
        }
    }

    /**
     * 自動 defer を行うべきか判定
     * モーダル表示(showModal)を行うボタンハンドラーや、
     * 即時応答が必要なケースでは false を返すようにオーバーライドする
     * @param {import('discord.js').Interaction} interaction
     * @returns {boolean}
     */
    shouldAutoDefer(interaction) {
        // デフォルト: モーダル送信(isModalSubmit)なら true
        // ボタン(isButton)やセレクト(isAnySelectMenu)なら true
        // ただし、特定の性質を持つものはサブクラスで false にする。
        return true;
    }

    /**
     * メインロジック（サブクラスで実装）
     * @param {import('discord.js').Interaction} interaction
     * @param {...any} args
     * @returns {Promise<void|any>}
     */
    async handle(interaction, ...args) {
        throw new Error(`handle() is not implemented in ${this.constructor.name}`);
    }

    /**
     * インタラクションの状態（deferred/replied）に応じて最適な応答メソッドを自動選択する
     * -----------------------------------------------------------------------
     * 1. すでに `replied` なら `followUp`
     * 2. `deferred` のみなら `editReply`
     * 3. 未応答なら `reply`
     * -----------------------------------------------------------------------
     * @param {import('discord.js').Interaction} interaction
     * @param {string | import('discord.js').InteractionReplyOptions} payload
     */
    async safeReply(interaction, payload) {
        // @ts-ignore - isRepliable は d.js v14 以降。チェックしておく。
        if (typeof interaction.isRepliable === 'function' && !interaction.isRepliable()) return;

        if (interaction.replied) {
            return await interaction.followUp(payload);
        }
        if (interaction.deferred) {
            return await interaction.editReply(payload);
        }
        // @ts-ignore
        return await interaction.reply(payload);
    }

    /**
     * エラーハンドリング
     * 基本的には共通の handleInteractionError に任せる
     */
    async handleError(interaction, err) {
        await handleInteractionError(interaction, err);
    }
}

module.exports = BaseInteractionHandler;
