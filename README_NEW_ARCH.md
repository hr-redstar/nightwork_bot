# Nightwork Bot - Professional Infrastructure

本プロジェクトは、大規模運用に耐えうる堅牢なアーキテクチャへと刷新されました。

## 主要アーキテクチャ

### 1. Storage Abstraction (`src/utils/storage/`)
- `StorageInterface` に基づく抽象化。
- `LocalStorage` (開発用) と `GcsStorage` (本番用) を `StorageFactory` で自動切替。

### 2. Type-Safe Configuration (`src/config/ConfigManager.js`)
- `zod` による実行時バリデーション。
- グローバル設定と店舗別設定を統一的に管理。

### 3. Automated Routing (`src/structures/AppRouter.js`)
- `src/modules/*/index.js` を自動スキャン。
- `prefixes` メタデータに基づきインタラクションを自動ルーティング。

### 4. UI Framework (`src/utils/ui/PanelBuilder.js`)
- Fluent API による Discord Embed / Component 構築。
- 統一されたデザインガイドラインの適用。

### 5. Observability (`src/utils/logger.js`, `errorHandlers.js`)
- `AsyncLocalStorage` によるリクエスト追跡 (`requestId`)。
- 統一されたエラーハンドリングと TraceID 通知。

## 開発ガイド

### 新しいモジュールの追加
1. `src/modules/{module_name}/index.js` を作成。
2. 以下の形式でエクスポート：
   ```javascript
   module.exports = {
     prefixes: ['prefix_name'],
     handleInteraction: async (interaction) => { ... }
   };
   ```
3. `AppRouter` が起動時に自動ロードします。

### ログの追跡
ログファイル (`logs/combined.log`) から特定の操作を追跡するには、`requestId` を使用します：
`grep "[Req:xxxxx]" logs/combined.log`
