/**
 * src/utils/validator.js
 * 共通バリデーションロジック
 */

const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(customParseFormat);

const Validator = {
    /**
     * 数値チェック (文字列が有効な数値か)
     * @param {string|number} value
     * @returns {boolean}
     */
    isNumber(value) {
        if (typeof value === 'number') return !isNaN(value);
        if (typeof value === 'string') return /^-?\d+(\.\d+)?$/.test(value.trim());
        return false;
    },

    /**
     * 日付形式チェック (YYYY-MM-DD)
     * @param {string} dateStr
     * @returns {boolean}
     */
    isValidDate(dateStr) {
        return dayjs(dateStr, 'YYYY-MM-DD', true).isValid();
    },

    /**
     * 時間形式チェック (HH:mm)
     * @param {string} timeStr
     * @returns {boolean}
     */
    isValidTime(timeStr) {
        return dayjs(timeStr, 'HH:mm', true).isValid();
    },

    /**
     * 空文字・Nullチェック
     * @param {string} str
     * @returns {boolean}
     */
    isEmpty(str) {
        return !str || str.trim().length === 0;
    },
};

module.exports = Validator;
