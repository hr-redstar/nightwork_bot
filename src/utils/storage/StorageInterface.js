/**
 * src/utils/storage/StorageInterface.js
 * ストレージ操作の抽象インターフェース
 * (Repository Pattern)
 */

class StorageInterface {
    /**
     * JSONファイルを読み込む
     * @param {string} path - ファイルパス (論理パス)
     * @returns {Promise<any>} パースされたJSONデータ、ファイルがない場合は null
     */
    async readJSON(path) {
        throw new Error('Not implemented');
    }

    /**
     * JSONファイルを保存する
     * @param {string} path - ファイルパス (論理パス)
     * @param {any} data - 保存するデータ
     * @returns {Promise<void>}
     */
    async saveJSON(path, data) {
        throw new Error('Not implemented');
    }
}

module.exports = StorageInterface;
