# 開発ガイドライン

## 新機能追加の手順

### 1. 推奨フォルダ構造 (三層アーキテクチャ)

大規模開発とテスト容易性を確保するため、各モジュールは **Handler / Service / Repository** の三層構造で構成します。

```bash
src/modules/{module_name}/
├── index.js              # エントリーポイント（AppRouterへの公開）
├── {Module}Repository.js # データアクセス層 (BaseRepositoryを継承)
├── {Module}Service.js    # ビジネスロジック層 (BaseServiceを継承)
├── routes/               # ルート定義ディレクトリ
├── handlers/             # Handlerクラス定義ディレクトリ (BaseInteractionHandlerを継承)
│   └── {Feature}Handler.js
└── {feature}/            # (Legacy) 旧来の機能別ディレクトリ
```

### 2. 各レイヤーの責務とルール

#### **Service 層 (最重要)**
- データの加工、権限チェックの判定ロジック、ビジネスルールを記述します。
- **命名規則**:
    - `prepare...Data`: UI表示に必要なデータを集約・整形する (例: `prepareSettingPanelData`)
    - `resolve...`: 複雑な紐付けや名前解決を行う (例: `resolveApproverMention`)
    - `process...`: 一連のビジネスプロセスを実行する (例: `processPunch`)
    - `validate...`: ビジネスルールに基づく整合性チェックを行う (例: `validateRequestAmount`)
- **制約**: `discord.js` を `require` してはいけません。
- **制約**: 引数には可能な限り Discord オブジェクト（Interaction等）を直接渡さず、必要なIDや名前のみを渡すか、DTOを使用します。
- これにより、Botを起動せずにロジックのユニットテストが可能になります。

#### **Handler 層 (Controller)**
- UIの構築（Embed, Button）と、Interactionの受付を実地します。
- **原則**: 全ての Handler は `BaseInteractionHandler` を継承します。
- **役割**: Handler は Discord I/O と Service 層を繋ぐ「アダプタ」です。
- ビジネスロジック（計算、加工、DB保存の順序決定など）は書かず、Service層を呼び出すのみに留めます。
- `PanelBuilder` を使用して、一貫したデザインを維持します。

> [!IMPORTANT]
> **インタラクション・ライフサイクル原則**
> - ❗ Handler / Service 内で `reply`, `deferReply`, `editReply` を**直接呼び出してはいけません**。
> - ❗ Interaction応答は `BaseInteractionHandler` に委ね、応答が必要な場合は `this.safeReply(interaction, payload)` を使用してください。
> - これにより、タイムアウト(10062)や二重応答(40060)を構造的に防止します。

---

## Panel作成

### 1. Schema定義

```javascript
// src/modules/{module}/setting/panelSchema.js
const { ButtonStyle } = require('discord.js');
const { IDS } = require('./ids');

const PANEL_SCHEMA = {
  title: 'パネルタイトル',
  description: 'パネルの説明',
  color: '#3498db',
  fields: [
    { key: 'field1', name: 'フィールド1', fallback: '未設定' },
    { key: 'field2', name: 'フィールド2', fallback: '未設定' },
  ],
  buttons: [
    [
      { id: IDS.BTN_ACTION1, label: 'アクション1', style: ButtonStyle.Primary },
      { id: IDS.BTN_ACTION2, label: 'アクション2', style: ButtonStyle.Secondary },
    ],
  ],
};

module.exports = { PANEL_SCHEMA };
```

### 2. Panel構築 (`PanelBuilder`)

埋め込みメッセージ（Embed）とコンポーネントを構築します。`src/utils/ui/panelBuilder.js` を使用することで、一貫したデザインと自動的な行分割（5ボタン制限への対応）が保証されます。

```javascript
const { buildPanel } = require('../../../utils/ui/panelBuilder');

async function buildSettingPanel(guildId) {
  const config = await getConfig(guildId);
  
  return buildPanel({
    title: '経費パネル設定',
    description: '経費申請の挙動を設定します。',
    fields: [
       { name: '承認役職', value: config.approver || '未設定' }
    ],
    buttons: [
      { id: IDS.BTN_SET_APPROVER, label: '承認役職設定', style: ButtonStyle.Primary },
      { id: IDS.BTN_EXPORT_CSV, label: 'CSV発行', style: ButtonStyle.Secondary }
    ],
    footer: 'Version 1.0.0'
  });
}
```

### 3. UI部品の共通化 (`ComponentFactory`)

ボタンやセレクトメニューを個別に生成する場合は、原則として `src/utils/ui/ComponentFactory.js` を使用します。これにより、ボイラープレート（定型コード）を削減し、将来的なデザイン変更を一括適用しやすくなります。

```javascript
const ui = require('../../../utils/ui/ComponentFactory');

const button = ui.createButton({ id: 'my_btn', label: '保存', style: ButtonStyle.Success });
const select = ui.createSelect({ id: 'my_sel', options: [...] });
```

---

## コーディング規約

### ファイル命名

- **ディレクトリ**: 小文字、単語区切りなし（`setting`, `request`）
- **ファイル**: キャメルケース（`panelSchema.js`, `configManager.js`）
- **定数ファイル**: 小文字（`ids.js`）

### 変数命名

```javascript
// 定数: UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 3;
const IDS = { ... };

// 変数/関数: camelCase
const userName = 'John';
async function handleSubmit() { ... }

// クラス: PascalCase
class ConfigManager { ... }

// プライベート: _prefix
const _internalCache = {};
```

### インポート順序

```javascript
// 1. Node.js組み込み
const fs = require('fs');

// 2. 外部ライブラリ
const { EmbedBuilder } = require('discord.js');

// 3. 内部ユーティリティ
const logger = require('../../utils/logger');

// 4. モジュール内部
const { IDS } = require('./ids');
```

---

## エラーハンドリング

### 推奨パターン（BaseInteractionHandler）

```javascript
// src/modules/{module}/handlers/{Feature}Handler.js
class FeatureHandler extends BaseInteractionHandler {
  async handle(interaction, param) {
    // 💡 deferReply は自動で行われるため、いきなりロジックを書いてOK
    const result = await service.process(param);
    
    // 💡 safeReply を使うことで、状態に応じた最適な応答が保証される
    await this.safeReply(interaction, {
      content: '✅ 処理完了',
      ephemeral: true
    });
  }
}
```

### グローバルエラーハンドラー
ハンドラー内でスローされた例外は、`BaseInteractionHandler` により自動的にキャッチされ、共通の `handleInteractionError` にトレースID付きで委ねられます。個別の `try-catch` 乱立は避けてください。

---

## テスト

### ユニットテスト（推奨）

```javascript
// tests/modules/{module}/handler.test.js
const { handleAction } = require('../../../src/modules/{module}/handler');

describe('Module Handler', () => {
  it('should handle action correctly', async () => {
    const mockInteraction = {
      customId: 'module:action:btn:test',
      reply: jest.fn()
    };
    
    await handleAction(mockInteraction);
    
    expect(mockInteraction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('成功')
      })
    );
  });
});
```

### 手動テスト

1. Discord開発サーバーで実行
2. 各インタラクションを順番にテスト
3. エラーケースも確認
4. ログを確認

---

## インフラ層の共通パーツ (`utils`)

### 1. バリデーション (`Validator`)
ビジネスルールに基づく検証は、Service層で行います。`src/utils/validator.js` を活用してください。エラー時は `ValidationError` をスローすることで、`BaseInteractionHandler` が自動的にユーザーへ分かりやすいエラーを返送します。

```javascript
const validator = require('../../../utils/validator');

function processRequest(amount) {
  // 💡 エラー時は自動で ephemeral な通知がユーザーへ送られます
  validator.checkAmount(amount, '申請金額'); 
}
```

### 2. 権限・役職チェック (`RoleResolver`)
モジュール内でロールIDの保持判定を行う場合は `src/utils/permission/RoleResolver.js` を使用してください。

```javascript
const roles = require('../../../utils/permission/RoleResolver');

if (!roles.hasAnyRole(member, allowedRoleIds)) {
    throw new ValidationError('権限がありません。');
}
```

### 3. ID生成 (`CustomId`)
インタラクションの ID 生成・パースは `src/utils/customId.js` に集約してください。
命名規則: `[module]:[feature]:[action]:[extra]`

### CustomID確認

```javascript
// Routerでマッチしない場合
router.on(id => {
  logger.debug(`[Router] Checking: ${id}`);
  return id.startsWith('module:');
}, handler);
```

---

## パフォーマンス

### 非同期処理

```javascript
// ✅ 並列実行
const [config, users] = await Promise.all([
  getConfig(guildId),
  getUsers(guildId)
]);

// ❌ 逐次実行（遅い）
const config = await getConfig(guildId);
const users = await getUsers(guildId);
```

### キャッシュ活用

```javascript
const cache = new Map();

async function getConfig(guildId) {
  if (cache.has(guildId)) {
    return cache.get(guildId);
  }
  
  const config = await loadConfig(guildId);
  cache.set(guildId, config);
  return config;
}
```

---

## チェックリスト

新機能追加時の確認項目：

- [ ] CustomIDが標準フォーマットに従っている
- [ ] IDS定数で管理されている
- [ ] Routerに登録されている
- [ ] エラーハンドリングが実装されている
- [ ] ログが適切に出力されている
- [ ] Panel SchemaでUI定義されている（該当する場合）
- [ ] レガシーIDとの互換性を考慮している
- [ ] 手動テストで動作確認済み
- [ ] ドキュメントを更新した
