const { z } = require('zod');

/**
 * 文字列を安全な形式（小文字、スペースなし）に変換
 */
const slugify = (s) => String(s).toLowerCase().replace(/\s+/g, '_');

const CustomId = {
    /**
     * CustomIDを生成
     * フォーマット: [module]:[feature]:[action]:[extra?]
     * -----------------------------------------------------------------------
     * @param {string} module  例: 'keihi', 'uriage'
     * @param {string} feature 例: 'request', 'setting'
     * @param {string} action  例: 'btn_approve', 'sel_item'
     * @param {string|number|null} [extra] 追加パラメータ (IDなど)
     * -----------------------------------------------------------------------
     */
    build(module, feature, action, extra = null) {
        const parts = [slugify(module), slugify(feature), slugify(action)];
        if (extra !== null && extra !== undefined) {
            parts.push(String(extra));
        }

        const id = parts.join(':');

        if (id.length > 100) {
            throw new Error(`CustomID exceeds Discord 100 chars limit: ${id}`);
        }
        return id;
    },

    /**
     * パース
     * @param {string} customId
     */
    parse(customId) {
        if (!customId) return { module: '', feature: '', action: '', extra: '' };
        const [module = '', feature = '', action = '', extra = ''] = customId.split(':');
        return { module, feature, action, extra };
    },

    /**
     * マッチングヘルパー
     */
    matches(customId, module, feature = null, action = null) {
        const p = this.parse(customId);
        if (p.module !== module) return false;
        if (feature && p.feature !== feature) return false;
        if (action && p.action !== action) return false;
        return true;
    },

    /**
     * 旧バージョン互換用 (Object引数)
     * @deprecated Use CustomId.build() directly
     */
    buildLegacy(params) {
        return this.build(params.domain, 'legacy', params.action, params.id || params.target);
    }
};

// Back-compatibility exports
module.exports = {
    buildCustomId: (m, f, a, e) => {
        if (typeof m === 'object') return CustomId.buildLegacy(m);
        return CustomId.build(m, f, a, e);
    },
    parseCustomId: (id) => CustomId.parse(id),
    isCustomId: (id, mod, feat) => CustomId.matches(id, mod, feat),
    ...CustomId
};
