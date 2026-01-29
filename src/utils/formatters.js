/**
 * src/utils/formatters.js
 * 表示用フォーマット統一ユーティリティ
 */

const dayjs = require('dayjs');

const Formatters = {
    /**
     * 通貨フォーマット (例: 1,000円)
     * @param {number|string} amount
     */
    toCurrency(amount) {
        if (amount === undefined || amount === null || amount === '') return '¥0';
        const num = Number(amount);
        return `¥${num.toLocaleString('ja-JP')}`;
    },

    /**
     * 日付フォーマット (例: 2024/01/01)
     * @param {string|Date} date
     */
    toDate(date) {
        if (!date) return '未設定';
        return dayjs(date).format('YYYY/MM/DD');
    },

    /**
     * 日時フォーマット (例: 2024/01/01 12:34)
     */
    toDateTime(date) {
        if (!date) return '未設定';
        return dayjs(date).format('YYYY/MM/DD HH:mm');
    },

    /**
     * 値が空文字、null、undefinedの場合にフォールバックを返す
     */
    withFallback(value, fallback = '未設定') {
        if (value === undefined || value === null || (typeof value === 'string' && value.trim().length === 0)) {
            return fallback;
        }
        return value;
    }
};

module.exports = Formatters;
