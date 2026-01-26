/**
 * src/config/ConfigManager.js
 * Zodスキーマを使用した型安全な設定管理クラス
 */

const { z } = require('zod');
const BaseConfigManager = require('../utils/baseConfigManager');

class ConfigManager extends BaseConfigManager {
    /**
     * @param {Object} options
     * @param {string} options.baseDir
     * @param {string} options.fileName
     * @param {z.ZodSchema} options.schema - Zodスキーマ
     */
    constructor({ baseDir, fileName, schema }) {
        super({ baseDir, fileName });
        this.schema = schema;
    }

    /**
     * データバリデーション (Zod)
     * @param {Object} data 
     * @throws {z.ZodError} バリデーションエラー
     */
    validate(data) {
        if (this.schema) {
            this.schema.parse(data);
        }
    }
}

module.exports = ConfigManager;
