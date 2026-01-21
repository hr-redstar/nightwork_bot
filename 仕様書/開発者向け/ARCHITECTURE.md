# アーキテクチャガイド

## 概要

このドキュメントは、送迎者Bot（nightwork_bot）の現在のアーキテクチャパターンと設計原則を説明します。

---

## コアアーキテクチャパターン

### 1. モジュール構造

各機能モジュールは以下の標準構造に従います：

```
src/modules/{module_name}/
├── index.js              # モジュールエントリーポイント
├── router.js             # InteractionRouter インスタンス
├── routes/               # ルート定義（機能別分割）
│   ├── setting.js
│   ├── request.js
│   └── legacy.js
├── setting/              # 設定関連
│   ├── ids.js           # CustomID定義
│   ├── panelSchema.js   # Panel UI定義
│   └── panel.js         # Panel実装
└── {feature}/           # 機能別ディレクトリ
    ├── ids.js
    └── handler.js
```

### 2. CustomID標準化

**フォーマット**: `domain:action:target[:id]`

**例:**
- `keihi:request:submit` - 経費申請送信
- `uriage:report:btn:approve:store123` - 売上承認ボタン（店舗ID付き）
- `syut:cast:btn:register:StoreA` - キャスト出退勤登録

**実装:**
```javascript
// src/modules/{module}/setting/ids.js
const PREFIX = 'keihi:setting';

const IDS = {
  PREFIX,
  BTN_APPROVER: `${PREFIX}:btn:approver`,
  SELECT_ROLE: `${PREFIX}:sel:role`,
  MODAL_EDIT: `${PREFIX}:modal:edit`,
};
```

### 3. InteractionRouter

イベント駆動型のルーティングシステム。

**基本構造:**
```javascript
// src/modules/{module}/router.js
const InteractionRouter = require('../../structures/InteractionRouter');
const router = new InteractionRouter();

// ルート登録
require('./routes/setting')(router);
require('./routes/request')(router);

module.exports = router;
```

**ルート定義:**
```javascript
// src/modules/{module}/routes/setting.js
module.exports = (router) => {
  // 完全一致
  router.on(IDS.BTN_APPROVER, handleApproverButton);
  
  // 正規表現
  router.on(/^keihi:request:approve:(.+)$/, handleApprove);
  
  // 条件関数
  router.on(id => id.startsWith('keihi:legacy:'), handleLegacy);
};
```

**ディスパッチ:**
```javascript
// src/modules/{module}/index.js
const router = require('./router');

async function handleModuleInteraction(interaction) {
  const handled = await router.dispatch(interaction);
  if (!handled) {
    logger.debug(`Unhandled: ${interaction.customId}`);
  }
}
```

### 4. Panel Schema

宣言的UI定義によるパネル構築。

**Schema定義:**
```javascript
// src/modules/{module}/setting/panelSchema.js
const { ButtonStyle } = require('discord.js');

const PANEL_SCHEMA = {
  title: '経費設定パネル',
  description: '経費申請の設定を管理します',
  color: '#e74c3c',
  fields: [
    { key: 'approver', name: '承認役職', fallback: '未設定' },
    { key: 'channel', name: '通知チャンネル', fallback: '未設定' },
  ],
  buttons: [
    [
      { id: IDS.BTN_APPROVER, label: '承認役職設定', style: ButtonStyle.Primary },
      { id: IDS.BTN_CHANNEL, label: 'チャンネル設定', style: ButtonStyle.Secondary },
    ],
  ],
};
```

**Panel構築:**
```javascript
// src/modules/{module}/setting/panel.js
const { buildPanel } = require('../../../utils/ui/panelBuilder');
const { PANEL_SCHEMA } = require('./panelSchema');

function buildSettingPanel(config) {
  const dataMap = {
    approver: config.approverRole ? `<@&${config.approverRole}>` : '未設定',
    channel: config.channelId ? `<#${config.channelId}>` : '未設定',
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
  });
}
```

---

## 共通ユーティリティ

### BaseConfigManager

GCS操作の共通化。

```javascript
const BaseConfigManager = require('../utils/baseConfigManager');

class KeihiConfigManager extends BaseConfigManager {
  constructor() {
    super('keihi', 'keihi_config.json');
  }
  
  async getConfig(guildId) {
    return await this.read(guildId);
  }
}
```

### PanelBuilder

```javascript
const { buildPanel } = require('../utils/ui/panelBuilder');

const panel = buildPanel({
  title: 'タイトル',
  description: '説明',
  color: '#3498db',
  fields: [{ name: 'フィールド', value: '値' }],
  buttons: [[{ id: 'btn_id', label: 'ボタン', style: ButtonStyle.Primary }]],
  footer: 'フッター',
  timestamp: true
});
```

---

## 設計原則

### 1. 関心の分離
- **Router**: ルーティングのみ
- **Handler**: ビジネスロジック
- **Panel**: UI構築
- **Config**: データ永続化

### 2. 宣言的設計
- UIはSchemaで定義
- ルートは明示的に登録
- IDは定数で管理

### 3. 後方互換性
- レガシーIDをRouterでサポート
- 段階的移行を可能に

### 4. テスタビリティ
- 各レイヤーを独立してテスト可能
- モックしやすい構造

---

## リファクタリング済みモジュール

| モジュール | CustomID | Router | Panel Schema | 備考 |
|----------|----------|--------|--------------|------|
| Config   | ✅ | ✅ | ✅ | 完全移行済み |
| Keihi    | ✅ | ✅ | ✅ | 完全移行済み |
| Uriage   | ✅ | ✅ | ✅ | 完全移行済み |
| Syut     | ✅ | ✅ | ✅ | 完全移行済み |
| Ride     | ❌ | ❌ | ❌ | 未対応 |
| Tennai   | ❌ | ❌ | ❌ | 未対応 |

---

## 次のステップ

1. **残りモジュールの移行**: Ride、Tennaiモジュール
2. **共通基盤強化**: EmbedFactory、ConfigService
3. **テスト整備**: ユニットテスト、統合テスト
4. **ドキュメント拡充**: API仕様、運用ガイド
