/**
 * src/modules/uriage/UriageRepository.js
 * 売上データの永続化を管理するリポジトリ (Platinum Refactoring)
 * 
 * Keihi パターンを踏襲した実装
 */

const BaseRepository = require('../../structures/BaseRepository');
const { z } = require('zod');
const { listFiles } = require('../../utils/gcs');
const path = require('path');

// --- Schemas ---
const UriageRecordSchema = z.object({
    id: z.string(),
    date: z.string(), // YYYY-MM-DD
    castName: z.string().optional(),
    amount: z.union([z.string(), z.number()]),
    status: z.string(),
    lastUpdated: z.string().optional(),
}).passthrough();

const DailyDataSchema = z.object({
    date: z.string(),
    reports: z.array(UriageRecordSchema).default([]),
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

class UriageRepository extends BaseRepository {
    constructor() {
        super('uriage', 'config.json');
    }

    // ==========================================
    //  Config Access
    // ==========================================

    async getGlobalConfig(guildId) {
        return await this.load(guildId, {});
    }

    // ==========================================
    //  Path Builders (Keihi と同じパターン)
    //  GCS/guildId/uriage/storeId/YYYY/MM/DD/YYYYMMDD.json
    // ==========================================

    _getDailyPath(guildId, storeId, dateStr) {
        const [yyyy, mm, dd] = dateStr.split('-');
        const compact = `${yyyy}${mm}${dd}`;
        return `GCS/${guildId}/uriage/${storeId}/${yyyy}/${mm}/${dd}/${compact}.json`;
    }

    _getMonthlyPath(guildId, storeId, monthStr) {
        const [yyyy, mm] = monthStr.split('-');
        return `GCS/${guildId}/uriage/${storeId}/${yyyy}/${mm}/${monthStr}.json`;
    }

    _getYearlyPath(guildId, storeId, yearStr) {
        return `GCS/${guildId}/uriage/${storeId}/${yearStr}/${yearStr}.json`;
    }

    // ==========================================
    //  Data Access Methods
    // ==========================================

    async getDailyData(guildId, storeId, dateStr) {
        const path = this._getDailyPath(guildId, storeId, dateStr);
        return await this.storage.readJSON(path) || { date: dateStr, reports: [] };
    }

    async saveDailyData(guildId, storeId, dateStr, data) {
        const path = this._getDailyPath(guildId, storeId, dateStr);
        await this.storage.saveJSON(path, data);
    }

    async getMonthlyData(guildId, storeId, monthStr) {
        const path = this._getMonthlyPath(guildId, storeId, monthStr);
        return await this.storage.readJSON(path) || { month: monthStr, byDay: {} };
    }

    async saveMonthlyData(guildId, storeId, monthStr, data) {
        const path = this._getMonthlyPath(guildId, storeId, monthStr);
        await this.storage.saveJSON(path, data);
    }

    async getYearlyData(guildId, storeId, yearStr) {
        const path = this._getYearlyPath(guildId, storeId, yearStr);
        return await this.storage.readJSON(path) || { year: yearStr, byMonth: {} };
    }

    async saveYearlyData(guildId, storeId, yearStr, data) {
        const path = this._getYearlyPath(guildId, storeId, yearStr);
        await this.storage.saveJSON(path, data);
    }

    // ==========================================
    //  Utility Methods
    // ==========================================

    async listTargets(guildId, storeId, rangeType) {
        const root = `GCS/${guildId}/uriage/${storeId}`;
        const files = await listFiles(root);

        const labels = new Set();
        const DAILY_COMPACT_RE = /^\d{8}$/;

        for (const file of files || []) {
            if (!file.endsWith('.json')) continue;
            const base = path.posix.basename(file, '.json');

            if (rangeType === 'daily') {
                if (DAILY_COMPACT_RE.test(base)) {
                    const label = `${base.slice(0, 4)}-${base.slice(4, 6)}-${base.slice(6, 8)}`;
                    labels.add(label);
                }
            } else if (rangeType === 'monthly') {
                if (/^\d{4}-\d{2}$/.test(base)) labels.add(base);
                if (DAILY_COMPACT_RE.test(base)) {
                    labels.add(`${base.slice(0, 4)}-${base.slice(4, 6)}`);
                }
            } else if (rangeType === 'yearly') {
                if (/^\d{4}$/.test(base)) labels.add(base);
                if (DAILY_COMPACT_RE.test(base)) {
                    labels.add(base.slice(0, 4));
                }
            }
        }

        return Array.from(labels).sort().reverse();
    }
}

module.exports = new UriageRepository();
