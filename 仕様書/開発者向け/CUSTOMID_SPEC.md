# CustomID仕様書

## 概要

送迎者Botでは、Discord Interactionの識別に使用するCustomIDを統一フォーマットで管理しています。

---

## フォーマット

### 基本形式

```
domain:action:target[:id]
```

### 構成要素

| 要素 | 説明 | 例 |
|------|------|-----|
| `domain` | モジュール名 | `keihi`, `uriage`, `syut`, `config` |
| `action` | アクション種別 | `request`, `setting`, `report` |
| `target` | 対象要素 | `btn`, `sel`, `modal` |
| `id` | 動的ID（オプション） | 店舗ID、ユーザーIDなど |

---

## 命名規則

### Domain（モジュール名）

モジュールの機能を表す短い名前：

- `config` - 設定
- `keihi` - 経費
- `uriage` - 売上
- `syut` - 出退勤
- `ride` - 送迎
- `tennai` - 店内状況

### Action（アクション種別）

機能カテゴリを表す：

- `setting` - 設定関連
- `request` - 申請関連
- `report` - 報告関連
- `approve` - 承認関連

### Target（対象要素）

UI要素の種類：

- `btn` - Button
- `sel` - SelectMenu
- `modal` - Modal
- `panel` - Panel

---

## 実装例

### 1. 静的ID（パラメータなし）

```javascript
// src/modules/keihi/setting/ids.js
const PREFIX = 'keihi:setting';

const IDS = {
  PREFIX,
  BTN_APPROVER: `${PREFIX}:btn:approver`,      // keihi:setting:btn:approver
  SELECT_CHANNEL: `${PREFIX}:sel:channel`,     // keihi:setting:sel:channel
  MODAL_EDIT: `${PREFIX}:modal:edit`,          // keihi:setting:modal:edit
};

module.exports = { IDS };
```

### 2. 動的ID（パラメータあり）

```javascript
// src/modules/uriage/report/ids.js
const PREFIX = 'uriage:report';

const IDS = {
  PREFIX,
  BTN_APPROVE: `${PREFIX}:btn:approve`,  // + :storeId
  BTN_REJECT: `${PREFIX}:btn:reject`,    // + :storeId
};

// 使用例
const customId = `${IDS.BTN_APPROVE}:store123`;
// => "uriage:report:btn:approve:store123"
```

### 3. Router登録

```javascript
// src/modules/uriage/routes/report.js
const { IDS } = require('../report/ids');

module.exports = (router) => {
  // 静的ID
  router.on(IDS.BTN_SUBMIT, handleSubmit);
  
  // 動的ID（正規表現）
  router.on(/^uriage:report:btn:approve:(.+)$/, (i, match) => {
    const storeId = match[1];
    return handleApprove(i, storeId);
  });
  
  // 動的ID（ヘルパー関数）
  routeWithParam(router, /^uriage:report:btn:reject:(.+)$/, handleReject);
};

function routeWithParam(router, regex, handler) {
  router.on(regex, (i) => {
    const match = i.customId.match(regex);
    return handler(i, match ? match[1] : null);
  });
}
```

---

## レガシーID対応

既存のCustomIDとの互換性を保つため、Routerで両方をサポート：

```javascript
// 新形式
router.on(IDS.BTN_APPROVER, handleApprover);

// 旧形式（レガシー）
router.on('keihi_approver', handleApprover);

// または条件関数で
router.on(id => id === IDS.BTN_APPROVER || id === 'keihi_approver', handleApprover);
```

---

## ベストプラクティス

### ✅ 推奨

```javascript
// IDS定数を使用
const customId = IDS.BTN_SUBMIT;

// 動的IDは明示的に構築
const customId = `${IDS.BTN_APPROVE}:${storeId}`;

// Routerで型安全に登録
router.on(IDS.BTN_SUBMIT, handleSubmit);
```

### ❌ 非推奨

```javascript
// ハードコーディング
const customId = 'keihi:setting:btn:submit';

// 文字列結合
const customId = 'keihi_approve_' + storeId;

// 直接文字列でルート登録
router.on('keihi:setting:btn:submit', handleSubmit);
```

---

## モジュール別CustomID一覧

### Config Module

```
config:store:btn:add
config:store:btn:edit:{storeId}
config:role:sel:role
config:user:modal:register
```

### Keihi Module

```
keihi:setting:btn:approver
keihi:setting:sel:channel
keihi:request:btn:submit
keihi:request:modal:edit
keihi:approve:btn:approve:{requestId}
```

### Uriage Module

```
uriage:setting:btn:approver
uriage:setting:panel:refresh
uriage:report:btn:submit:{storeId}
uriage:report:status:approve:{reportId}
```

### Syut Module

```
syut:setting:btn:install:cast
syut:cast:btn:register:{storeName}
syut:cast:sel:role_select:{storeName}
syut:kuro:btn:register:{storeName}
```

---

## トラブルシューティング

### CustomIDが長すぎる

Discord CustomIDの最大長は100文字です。

**解決策:**
- IDを短縮（`store123` → `s123`）
- ハッシュ化を検討
- データベースに保存し、短いキーで参照

### 動的IDの抽出エラー

```javascript
// ❌ 誤り
const [, storeId] = customId.split(':');  // 位置依存

// ✅ 正しい
const match = customId.match(/^uriage:report:btn:approve:(.+)$/);
const storeId = match ? match[1] : null;
```

---

## 移行ガイド

既存モジュールを新形式に移行する手順：

1. **IDs定義作成**: `{module}/{feature}/ids.js`
2. **CustomID更新**: ハードコード文字列をIDS定数に置換
3. **Router登録**: 新旧両方のIDをサポート
4. **テスト**: 既存機能が動作することを確認
5. **レガシー削除**: 一定期間後、旧IDサポートを削除
