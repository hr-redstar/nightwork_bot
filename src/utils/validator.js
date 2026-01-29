const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const { ValidationError } = require('./errorHandlers');

dayjs.extend(customParseFormat);

const Validator = {
    /**
     * 文字列が有効な数値か
     */
    isNumber(value) {
        if (typeof value === 'number') return !isNaN(value);
        if (typeof value === 'string') return /^-?\d+(\.\d+)?$/.test(value.trim());
        return false;
    },

    validateRequired(value, label) { return this.checkRequired(value, label); },
    validateAmount(value, label) { return this.checkAmount(value, label); },
    validateDate(dateStr, label) { return this.checkDate(dateStr, label); },
    validateLength(value, max, label) { return this.checkLength(value, max, label); },

    /**
     * 必須チェック
     * @throws {ValidationError}
     */
    checkRequired(value, label) {
        if (value === undefined || value === null || (typeof value === 'string' && value.trim().length === 0)) {
            throw new ValidationError(`${label}は必須項目です。`);
        }
        return value;
    },

    /**
     * 金額チェック (正の整数)
     * @throws {ValidationError}
     */
    checkAmount(value, label = '金額') {
        const num = Number(value);
        if (isNaN(num) || !Number.isInteger(num) || num < 0) {
            throw new ValidationError(`${label}には0以上の整数を入力してください。`);
        }
        return num;
    },

    /**
     * 日付形式チェック (YYYY-MM-DD)
     * @throws {ValidationError}
     */
    checkDate(dateStr, label = '日付') {
        if (!dayjs(dateStr, 'YYYY-MM-DD', true).isValid()) {
            throw new ValidationError(`${label}は「YYYY-MM-DD」形式で入力してください（例: 2024-01-01）。`);
        }
        return dateStr;
    },

    /**
     * 文字数制限チェック
     * @throws {ValidationError}
     */
    checkLength(value, max, label) {
        if (value && value.length > max) {
            throw new ValidationError(`${label}は${max}文字以内で入力してください。`);
        }
        return value;
    },

    /**
     * 旧来の boolean 返却メソッド用互換性
     */
    isValidDate(dateStr) {
        return dayjs(dateStr, 'YYYY-MM-DD', true).isValid();
    },

    isValidTime(timeStr) {
        return dayjs(timeStr, 'HH:mm', true).isValid();
    },

    isEmpty(str) {
        return !str || str.trim().length === 0;
    }
};

module.exports = Validator;
