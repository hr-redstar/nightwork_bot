// src/utils/keihi/keihiConfigManager.js
// ----------------------------------------------------
// 経費設定の GCS 読み書きユーティリティ
// ----------------------------------------------------

const BaseConfigManager = require('../baseConfigManager');
const { z } = require('zod');

// Zodスキーマ定義
const KeihiGlobalConfigSchema = z.object({
  settingPanelChannelId: z.string().nullable().optional(),
  settingPanelMessageId: z.string().nullable().optional(),
}).passthrough();

const KeihiStoreConfigSchema = z.object({
  storeName: z.string(),
  viewerRoleIds: z.array(z.string()).optional(),
  approverRoleIds: z.array(z.string()).optional(),
  requesterRoleIds: z.array(z.string()).optional(),
  requestPanelChannelId: z.string().nullable().optional(),
  requestPanelMessageId: z.string().nullable().optional(),
  logChannelId: z.string().nullable().optional(),
  items: z.array(z.any()).optional(),
}).passthrough();

// BaseConfigManagerを拡張してバリデーション追加
class KeihiConfigManager extends BaseConfigManager {
  validate(data) {
    // データ構造に応じて適切なスキーマを使用
    if (data.storeName) {
      KeihiStoreConfigSchema.parse(data);
    } else {
      KeihiGlobalConfigSchema.parse(data);
    }
  }
}

// インスタンス作成
const manager = new KeihiConfigManager({
  baseDir: 'keihi',
  fileName: 'config.json',
});
