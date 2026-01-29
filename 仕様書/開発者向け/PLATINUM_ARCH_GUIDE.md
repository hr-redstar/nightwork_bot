# 💎 Platinum アーキテクチャ指針 & UI美学ガイド

本ドキュメントは、ボットの品質を「Platinum（最高級）」に保つための設計思想と実装ルールを定義したものです。

---

## 🏗️ 1. 基底構造 (The Core Logic)

すべてのモジュールは、以下の基底クラスを継承することを必須とします。これにより、「車輪の再発明」を防ぎ、全機能で一貫したエラーハンドリングとライフサイクル管理を保証します。

### **Service 層** (`StoreServiceBase` 継承)
- **役割**: 店舗・役職の解決、計算、データ加工。
- **Platinum基準**: 
  - `super.resolveApproverMention()` を活用し、役職表示のフォーマットを統一する。
  - `discord.js` を直接 include しない（テスト容易性の確保）。

### **Command 層** (`BaseCommand` 継承)
- **役割**: スラッシュコマンドの定義とエントリー。
- **Platinum基準**:
  - `defer: true` を基本とし、応答のタイムアウトを物理的に排除する。
  - `flags: MessageFlags.Ephemeral` を使用し、非推奨警告を許容しない。

---

## 🎨 2. UI/UX 美学 (Visual Consistency)

ボットの「品格」を維持するため、すべての Embed メッセージは `Theme.js` を経由して構築します。

### **色の使用規定**
- **ブランドカラー**: `Theme.COLORS.BRAND` (`0x2ecc71`) を原則使用。
- **ステータス**: `Theme.COLORS.SUCCESS`, `WARNING`, `DANGER` を用途に応じて使い分ける。

### **パネル構築基準**
- `PanelBuilder.js` を必ず使用する。
  - 直接 `EmbedBuilder` を捏ねくり回さない。
  - ボタンは 5 つごとに行を分ける（DiscordのAPI制約への自動対応）。

---

## 📦 3. モジュール拡張の 3 ステップ

新規機能を追加する際は、以下の順番で「積み上げ」を行ってください。

1.  **Repository**: GCS への読み書きロジックのみを記述。
2.  **Service**: `StoreServiceBase` を継承。ビジネスロジックに集中。
3.  **AppRouter 統合**: `index.js` で `prefixes` を定義し、グローバルフローに合流。

---

> [!TIP]
> **「Platinum」とは、単に動くことではなく、メンテナンスをする人が「美しい」と感じる状態を指します。**
