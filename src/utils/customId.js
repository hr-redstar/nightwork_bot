/**
 * Custom Id Utility
 * ----------------------------------------------------
 * 命名規則: [domain]:[action]:[target]:[id?]
 * 例:
 *   keihi:approve:request:123
 *   config:store:add
 *   uriage:delete:csv
 * ----------------------------------------------------
 */

/**
 * CustomId をオブジェクトにパースする
 * @param {string} customId - "domain:action:target:id" or "domain:action:target"
 * @returns {{ domain: string, action: string, target?: string, id?: string }}
 */
function parseCustomId(customId) {
    if (!customId) return {};
    const parts = customId.split(':');
    return {
        domain: parts[0] || '',
        action: parts[1] || '',
        target: parts[2] || '',
        id: parts[3] || '', // オプショナル
    };
}

/**
 * オブジェクトから CustomId 文字列を生成する
 * @param {Object} params
 * @param {string} params.domain
 * @param {string} params.action
 * @param {string} params.target
 * @param {string} [params.id]
 * @returns {string}
 */
function buildCustomId({ domain, action, target, id }) {
    const parts = [domain, action, target];
    if (id) parts.push(id);
    return parts.join(':');
}

/**
 * 特定のドメイン・アクションか判定するヘルパー
 * @param {string} customId
 * @param {string} domain
 * @param {string} [action]
 * @returns {boolean}
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
};
