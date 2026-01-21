// src/utils/uriage/uriageConfigManager.js
// ----------------------------------------------------
// 売上機能の GCS 読み書きユーティリティ
// ----------------------------------------------------

const BaseConfigManager = require('../baseConfigManager');
const { z } = require('zod');

// Zodスキーマ定義
const UriageGlobalConfigSchema = z.object({
  configPanel: z.any().nullable().optional(),
  panels: z.record(z.any()).optional(),
  approverPositionIds: z.array(z.string()).optional(),
  approverRoleIds: z.array(z.string()).optional(),
  csvUpdatedAt: z.string().nullable().optional(),
}).passthrough();

const UriageStoreConfigSchema = z.object({
  storeId: z.string(),
  channelId: z.string().nullable().optional(),
  messageId: z.string().nullable().optional(),
  viewRoleIds: z.array(z.string()).optional(),
  requestRoleIds: z.array(z.string()).optional(),
  viewRolePositionIds: z.array(z.string()).optional(),
  requestRolePositionIds: z.array(z.string()).optional(),
  items: z.array(z.any()).optional(),
  lastUpdated: z.string().nullable().optional(),
}).passthrough();

class UriageConfigManager extends BaseConfigManager {
  /**
   * Zodスキーマでバリデーション
   */
  validate(data) {
    if (data.storeId) {
      UriageStoreConfigSchema.parse(data);
    } else {
      UriageGlobalConfigSchema.parse(data);
    }
  }
}

const manager = new UriageConfigManager({
  baseDir: 'uriage',
  fileName: 'config.json',
});
