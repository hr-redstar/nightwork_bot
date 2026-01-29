/**
 * src/modules/keihi/KeihiRepository.js
 * 経費データの永続化を管理するリポジトリ
 * (Platinum Refactoring: gcsKeihiManager.js の後継)
 */

const BaseRepository = require('../../structures/BaseRepository');
const { z } = require('zod');
const { listFiles } = require('../../utils/gcs');
const path = require('path');

// --- Schemas ---
const KeihiRecordSchema = z.object({
    id: z.string(),
    date: z.string(), // YYYY-MM-DD
    department: z.string().optional(),
    amount: z.union([z.string(), z.number()]),
    status: z.string(),
    lastUpdated: z.string().optional(),
}).passthrough();

const DailyDataSchema = z.object({
    date: z.string(),
    requests: z.array(KeihiRecordSchema).default([]),
    totalAmount: z.number().default(0),
    totalApprovedAmount: z.number().default(0),
    lastUpdated: z.string().optional(),
}).passthrough();

const MonthlyDataSchema = z.object({
    month: z.string(), // YYYY-MM
    byDay: z.record(z.number()).default({}),
    totalAmount: z.number().default(0),
    totalApprovedAmount: z.number().default(0),
    lastUpdated: z.string().optional(),
}).passthrough();

const YearlyDataSchema = z.object({
    year: z.string(), // YYYY
    byMonth: z.record(z.number()).default({}),
    totalAmount: z.number().default(0),
    totalApprovedAmount: z.number().default(0),
    lastUpdated: z.string().optional(),
}).passthrough();

class KeihiRepository extends BaseRepository {
    constructor() {
        super('keihi', 'config.json');
    }

    // ==========================================
    //  Config Access
    // ==========================================

    async getGlobalConfig(guildId) {
        return await this.load(guildId, {});
    }

    // ==========================================
    //  Path Builders
    //  GCS/guildId/keihi/storeId/YYYY/MM/DD/YYYYMMDD.json
    // ==========================================

    _getDailyPath(guildId, storeId, dateStr) {
        // dateStr: YYYY-MM-DD
        const [yyyy, mm, dd] = dateStr.split('-');
        const compact = `${yyyy}${mm}${dd}`;
        return `GCS/${guildId}/keihi/${storeId}/${yyyy}/${mm}/${dd}/${compact}.json`;
    }

    _getMonthlyPath(guildId, storeId, monthStr) {
        // monthStr: YYYY-MM
        const [yyyy, mm] = monthStr.split('-');
        return `GCS/${guildId}/keihi/${storeId}/${yyyy}/${mm}/${monthStr}.json`;
    }

    _getYearlyPath(guildId, storeId, yearStr) {
        // yearStr: YYYY
        return `GCS/${guildId}/keihi/${storeId}/${yearStr}/${yearStr}.json`;
    }

    // ==========================================
    //  Data Access Methods
    // ==========================================

    /**
     * 日次データ取得
     */
    async getDailyData(guildId, storeId, dateStr) {
        const path = this._getDailyPath(guildId, storeId, dateStr);
        return await this.storage.readJSON(path) || { date: dateStr, requests: [] };
    }

    /**
     * 日次データ保存
     */
    async saveDailyData(guildId, storeId, dateStr, data) {
        // validate(data, DailyDataSchema); // TODO: 本番適用時に有効化
        const path = this._getDailyPath(guildId, storeId, dateStr);
        await this.storage.saveJSON(path, data);
    }

    /**
     * 月次データ取得
     */
    async getMonthlyData(guildId, storeId, monthStr) {
        const path = this._getMonthlyPath(guildId, storeId, monthStr);
        return await this.storage.readJSON(path) || { month: monthStr, byDay: {} };
    }

    /**
     * 月次データ保存
     */
    async saveMonthlyData(guildId, storeId, monthStr, data) {
        const path = this._getMonthlyPath(guildId, storeId, monthStr);
        await this.storage.saveJSON(path, data);
    }

    /**
     * 年次データ取得
     */
    async getYearlyData(guildId, storeId, yearStr) {
        const path = this._getYearlyPath(guildId, storeId, yearStr);
        return await this.storage.readJSON(path) || { year: yearStr, byMonth: {} };
    }

    /**
     * 年次データ保存
     */
    async saveYearlyData(guildId, storeId, yearStr, data) {
        const path = this._getYearlyPath(guildId, storeId, yearStr);
        await this.storage.saveJSON(path, data);
    }

    // ==========================================
    //  Utility Methods (for UI/Listing)
    // ==========================================

    /**
     * 存在するJSONファイルの日付ラベル一覧を取得
     * @param {string} rangeType 'daily' | 'monthly' | 'yearly' | 'quarter'
     */
    async listTargets(guildId, storeId, rangeType) {
        // 基本ルートディレクトリ
        const root = `GCS/${guildId}/keihi/${storeId}`;
        const files = await listFiles(root);

        const labels = new Set();
        const DAILY_COMPACT_RE = /^\d{8}$/; // YYYYMMDD

        for (const file of files || []) {
            if (!file.endsWith('.json')) continue;
            const base = path.posix.basename(file, '.json');

            if (rangeType === 'daily') {
                if (DAILY_COMPACT_RE.test(base)) {
                    // YYYYMMDD -> YYYY-MM-DD
                    const label = `${base.slice(0, 4)}-${base.slice(4, 6)}-${base.slice(6, 8)}`;
                    labels.add(label);
                }
            } else if (rangeType === 'monthly') {
                if (/^\d{4}-\d{2}$/.test(base)) labels.add(base);
                // Dailyファイルからも補完
                if (DAILY_COMPACT_RE.test(base)) {
                    const label = `${base.slice(0, 4)}-${base.slice(4, 6)}`;
                    labels.add(label);
                }
            } else if (rangeType === 'yearly') {
                if (/^\d{4}$/.test(base)) labels.add(base);
                if (DAILY_COMPACT_RE.test(base)) {
                    labels.add(base.slice(0, 4));
                }
            }
        }

        if (rangeType === 'quarter') {
            return this._generateQuarterLabels(Array.from(labels));
        }

        return Array.from(labels).sort().reverse();
    }

    _generateQuarterLabels(sourceLabels) {
        // 月次や日次の集計結果から四半期ラベルを生成するロジック (既存互換)
        // 実装は必要に応じて gcsKeihiManager から移植
        return []; // Template placeholder
    }
}

module.exports = new KeihiRepository();
