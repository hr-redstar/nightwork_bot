# 📄 新規モジュール開発テンプレート (完全版)

新しく機能を追加する際は、このテンプレートをコピーして使用してください。
本ボットの**「三層アーキテクチャ ＋ インフラ層（utils）連携」**に従った構成になっています。

## 📁 フォルダ構造
```text
src/modules/{module_name}/
├── index.js              # エントリーポイント (AppRouterへの公開)
├── {Module}Repository.js # データアクセス (BaseRepository継承推奨)
├── {Module}Service.js    # ビジネスロジック
├── router.js             # モジュール内ルーティング
├── handlers/             # インタラクション受付 (BaseInteractionHandler継承)
│   └── ActionHandler.js
└── ui/                   # UI構築
    ├── panelSchema.js    # Embed/Buttonの定義
    └── panel.js          # PanelBuilderによる組み立て
```

## 🏗️ 実装例

### 1. Entry Point (`index.js`)
```javascript
const router = require('./router');

module.exports = {
  prefixes: ['my_module'], // AppRouterがフックするID接頭辞
  router                   // InteractionRouterインスタンスを渡す
};
```

### 2. Router (`router.js`)
```javascript
const InteractionRouter = require('../../structures/InteractionRouter');
const actionHandler = require('./handlers/ActionHandler');

const router = new InteractionRouter();

// CustomID ⇄ Handler の対応表
router.on('my_module:btn:execute', actionHandler);

module.exports = router;
```

### 3. Handler (`handlers/ActionHandler.js`)
```javascript
const BaseInteractionHandler = require('../../../structures/BaseInteractionHandler');
const InteractionDTO = require('../../../utils/dto/InteractionDTO');
const service = require('../MyModuleService');

class ActionHandler extends BaseInteractionHandler {
    async handle(interaction, param) {
        // 1. DTOによるコンテキスト抽出
        const dto = new InteractionDTO(interaction);
        
        // 2. Service呼び出し (Discordオブジェクトを渡さない)
        const result = await service.processAction(dto.getContext(), param);
        
        // 3. safeReply による安全な応答 (自動 deferReply 済み)
        await this.safeReply(interaction, { content: `✅ 結果: ${result}` });
    }
}
module.exports = new ActionHandler();
```

### 4. Service (`MyModuleService.js`)
```javascript
const validator = require('../../utils/validator');
const repo = require('./MyModuleRepository');

class MyModuleService {
    async processAction(ctx, param) {
        const { guildId, userId } = ctx;
        
        // 1. バリデーション (utils使用: validateXXX)
        validator.validateRequired(param, 'パラメータ');
        
        // 2. ビジネスロジック (Repository経由)
        const data = await repo.load(guildId);
        // ...ロジック...
        
        return '成功';
    }
}
module.exports = new MyModuleService();
```

### 5. Repository (`MyModuleRepository.js`)
```javascript
const BaseConfigManager = require('../../utils/baseConfigManager');

const manager = new BaseConfigManager({
    baseDir: 'my_module',
{{ ... }}
};
```

## 💡 開発のヒント
- **ACKの自動化**: `BaseInteractionHandler` を使うだけで、3秒以内の応答（保留中...）が自動で行われます。
- **モーダル表示時**: モーダルを出すボタンハンドラーでは `shouldAutoDefer() { return false; }` をオーバーライドしてください。
- **エラー処理不要**: ハンドラー内で例外をスローすれば、自動的にトレースID付きでユーザーに通知されます。
- **デザインの一貫性**: パネル作成は `PanelBuilder` を、ボタン生成は `ComponentFactory` を使用してください。
