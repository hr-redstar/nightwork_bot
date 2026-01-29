/**
 * src/utils/dto/BaseDTO.js
 * データ転送オブジェクト（DTO）の基底クラス
 * -----------------------------------------
 * - Handler から Service へ渡すデータを構造化
 * - データの正規化とバリデーションをカプセル化
 * - Discord.js への依存を排除するための軽量な器
 */

class BaseDTO {
    /**
     * オブジェクトからDTOを生成
     * @param {Object} data 
     */
    constructor(data = {}) {
        this.rawData = data;
    }

    /**
     * JSON形式のオブジェクトを返す
     */
    toJSON() {
        // サブクラスで必要な項目を抽出して返す
        return { ...this };
    }

    /**
     * 簡易的なバリデーション（必要に応じてオーバーライド）
     */
    validate() {
        return true;
    }
}

module.exports = BaseDTO;
