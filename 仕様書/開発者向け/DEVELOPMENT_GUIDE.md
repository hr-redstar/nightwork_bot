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
│   └── {feature}.js
└── {feature}/
    └── handler.js        # Handler層 (UI構築・ディスパッチ)
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
- **役割**: Handler は Discord I/O と Service 層を繋ぐ「アダプタ」です。
- ビジネスロジック（計算、加工、DB保存の順序決定など）は書かず、Service層を呼び出すのみに留めます。
- `PanelBuilder` を使用して、一貫したデザインを維持します。

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

### 2. Panel構築

```javascript
// src/modules/{module}/setting/panel.js
const { buildPanel } = require('../../../utils/ui/panelBuilder');
const { PANEL_SCHEMA } = require('./panelSchema');

async function buildSettingPanel(guildId) {
  const config = await getConfig(guildId);
  
  const dataMap = {
    field1: config.value1 || '未設定',
    field2: config.value2 || '未設定',
  };
  
  const fields = PANEL_SCHEMA.fields.map(f => ({
    name: f.name,
    value: dataMap[f.key] || f.fallback
  }));
  
  return buildPanel({
    title: PANEL_SCHEMA.title,
    description: PANEL_SCHEMA.description,
    color: PANEL_SCHEMA.color,
    fields,
    buttons: PANEL_SCHEMA.buttons,
    footer: 'フッター（オプション）',
    timestamp: true
  });
}
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

### 基本パターン

```javascript
async function handleAction(interaction) {
  try {
    // メイン処理
    await doSomething();
    
    await interaction.reply({
      content: '✅ 成功',
      flags: MessageFlags.Ephemeral
    });
  } catch (error) {
    logger.error('[Module] Error:', error);
    
    await interaction.reply({
      content: '❌ エラーが発生しました',
      flags: MessageFlags.Ephemeral
    }).catch(() => {});
  }
}
```

### グローバルエラーハンドラー

```javascript
const { handleInteractionError } = require('../../utils/errorHandlers');

async function handleModuleInteraction(interaction) {
  try {
    await router.dispatch(interaction);
  } catch (err) {
    await handleInteractionError(interaction, err);
  }
}
```

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

## デバッグ

### ログレベル

```javascript
logger.debug('詳細情報');  // 開発時のみ
logger.info('通常情報');   // 重要なイベント
logger.warn('警告');       // 問題の可能性
logger.error('エラー');    // エラー発生
```

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
