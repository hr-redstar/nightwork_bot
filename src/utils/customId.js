/**
 * Custom Id Utility
 * ----------------------------------------------------
 * 命名規則: [domain]:[action]:[target]:[id?]
 * ----------------------------------------------------
 */

const { z } = require('zod');

// CustomID スキーマ定義
const CustomIdSchema = z.object({
    domain: z.string().min(1),
    action: z.string().min(1),
    target: z.string().default(''),
    id: z.string().optional(),
});

/**
 * CustomId をオブジェクトにパースする
 * @param {string} customId
 * @returns {{ domain: string, action: string, target?: string, id?: string }}
 */
function parseCustomId(customId) {
    if (!customId) return {};
    const parts = customId.split(':');
    const data = {
        domain: parts[0] || '',
        action: parts[1] || '',
        target: parts[2] || '',
        id: parts[3] || '',
    };

    // パース結果もバリデーションはしない（読み取りは柔軟に）
    return data;
}

/**
 * オブジェクトから CustomId 文字列を生成する
 * @param {Object} params
 * @returns {string}
 * @throws {Error} Length limit or Validation error
 */
function buildCustomId(params) {
    // スキーマ検証
    const validated = CustomIdSchema.parse(params);

    const parts = [validated.domain, validated.action, validated.target];
    if (validated.id) parts.push(validated.id);

    const customId = parts.join(':');

    if (customId.length > 100) {
        throw new Error(
            `CustomID exceeds Discord limit (${customId.length}/100 chars): ${customId.substring(0, 50)}...`
        );
    }

    return customId;
}

/**
 * 特定のドメイン・アクションか判定するヘルパー
 */
function isCustomId(customId, domain, action) {
    const parsed = parseCustomId(customId);
    if (parsed.domain !== domain) return false;
    if (action && parsed.action !== action) return false;
    return true;
}

module.exports = {
    parseCustomId,
    buildCustomId,
    isCustomId,
    CustomIdSchema, // 外部で再利用可能に
};
