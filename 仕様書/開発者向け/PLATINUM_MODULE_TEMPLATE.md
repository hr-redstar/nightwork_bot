# 📄 Platinum モジュール開発テンプレート

このファイルをコピーするだけで、『Platinum基盤』に準拠した最高品質のモジュールを瞬時に作成できます。

---

## 🏗️ 実装テンプレート集

### 1. サービス層 (`src/modules/{module}/Service.js`)
`StoreServiceBase` を継承することで、店舗・役職解決の力を手に入れます。

```javascript
const StoreServiceBase = require('../common/StoreServiceBase');
const logger = require('../../utils/logger');

class MyFeatureService extends StoreServiceBase {
    /**
     * @param {string} guildId 
     */
    async prepareDisplayData(guildId) {
        // 店舗ロール設定を1行でロード (Platinum Power)
        const storeRoleConfig = await this.loadStoreRoleConfig(guildId);
        return { storeRoleConfig };
    }
}
module.exports = new MyFeatureService();
```

### 2. UI定義 (`src/modules/{module}/ui/panelSchema.js`)
`Theme.js` を使用し、視覚的高潔さを保証します。

```javascript
const Theme = require('../../../utils/ui/Theme');
const { ButtonStyle } = require('discord.js');

const MY_PANEL_SCHEMA = {
    title: '💎 新機能パネル',
    color: Theme.COLORS.BRAND_HEX, // 常に共通ブランドカラーを使用
    fields: [
        { key: 'status', name: '現在の状態', fallback: '待機中' }
    ],
    buttons: [
        { id: 'my_mod:action:run', label: '実行', style: ButtonStyle.Primary }
    ]
};
module.exports = { MY_PANEL_SCHEMA };
```

### 3. コマンド定義 (`src/commands/XX_設定新機能.js`)
`BaseCommand` を継承し、非推奨警告ゼロを実現します。

```javascript
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const BaseCommand = require('../structures/BaseCommand');

class MySettingCommand extends BaseCommand {
    constructor() {
        super({ flags: MessageFlags.Ephemeral, defer: true });
        this.data = new SlashCommandBuilder()
            .setName('設定新機能')
            .setDescription('Platinum基準の新機能を設定します');
    }

    async run(interaction) {
        // ビジネスロジックを呼び出し、safeReplyで応答
        await interaction.editReply({ content: '✅ Platinumモジュールが稼働しました' });
    }
}
module.exports = new MySettingCommand();
```

---

## 💎 Platinum 開発チェックリスト

- [ ] `Theme.COLORS.BRAND` を使用しているか
- [ ] `StoreServiceBase` を継承しているか
- [ ] `PanelBuilder` で UI を構築しているか
- [ ] `MessageFlags.Ephemeral` を使用しているか
- [ ] インポート文の大文字・小文字は正確か (`PanelBuilder` 等)
