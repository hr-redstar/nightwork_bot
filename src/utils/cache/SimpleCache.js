/**
 * src/utils/cache/SimpleCache.js
 * メモリベースの簡易TTLキャッシュ
 * -----------------------------------------
 * - 頻繁にアクセスする設定値などのキャッシュ用
 * - 有効期限（TTL）を設定可能
 * - メモリ上限等は設定せず、シンプルさを優先
 */

class SimpleCache {
    /**
     * @param {number} defaultTtl - デフォルトの有効期限 (ms)
     */
    constructor(defaultTtl = 60 * 1000) {
        this.cache = new Map();
        this.defaultTtl = defaultTtl;
    }

    /**
     * 値をセット
     */
    set(key, value, ttl = this.defaultTtl) {
        const expiresAt = Date.now() + ttl;
        this.cache.set(key, { value, expiresAt });
    }

    /**
     * 値を取得 (有効期限切れの場合は null)
     */
    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;

        if (Date.now() > item.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        return item.value;
    }

    /**
     * キャッシュを削除
     */
    delete(key) {
        this.cache.delete(key);
    }

    /**
     * 全てクリア
     */
    clear() {
        this.cache.clear();
    }

    /**
     * 有効期限付き取得 (なければ値を生成してセット)
     * @param {string} key 
     * @param {Function} producer - 非同期の値生成関数
     * @param {number} [ttl]
     */
    async getOrFetch(key, producer, ttl = this.defaultTtl) {
        const cached = this.get(key);
        if (cached !== null) return cached;

        const fresh = await producer();
        if (fresh !== null && fresh !== undefined) {
            this.set(key, fresh, ttl);
        }
        return fresh;
    }
}

module.exports = SimpleCache;
