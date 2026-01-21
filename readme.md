# 送迎者Bot (nightwork_bot)

ナイトワーク業界向けの業務改善Discord Bot

---

## 概要

このBotは、ナイトワーク店舗の日常業務を効率化するための包括的な機能を提供します：

- **設定管理** - 店舗、役職、ユーザー登録
- **経費管理** - 申請、承認フロー
- **売上管理** - 報告、承認フロー
- **出退勤管理** - キャスト・黒服の勤怠記録
- **送迎管理** - 送迎依頼、配車管理
- **店内状況** - ひっかけ機能
- **その他** - ChatGPT連携、くじ引き、ダイスなど

---

## 環境

- **実行環境**: Google Cloud Run
- **CI/CD**: GitHub Actions
- **ストレージ**: Google Cloud Storage (GCS)
- **Node.js**: v18以上推奨

---

## セットアップ

### 1. 環境変数設定

`.env`ファイルを作成し、以下の設定を行います：

```env
# 開発/本番環境
NODE_ENV=development

# Discord
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_client_id

# Google Cloud
GCS_BUCKET_NAME=your-gcs-bucket-name
GCS_ENABLED=true
USE_GCS=true
GOOGLE_APPLICATION_CREDENTIALS=./path-to-your-service-account.json

# 開発用DiscordサーバーID
GUILD_ID=your_guild_id
DEV_GUILD_IDS=your_dev_guild_ids

# HP (オプション)
NEXT_PUBLIC_BASE_URL=https://your-domain.cloud.run
BOT_INTERNAL_URL=http://localhost:8080
```

### 2. 依存関係インストール

```bash
npm install
```

### 3. 起動

```bash
# 開発環境
npm run dev

# 本番環境
npm start
```

---

## アーキテクチャ

詳細は[アーキテクチャガイド](./仕様書/開発者向け/ARCHITECTURE.md)を参照してください。

### モジュール構造

```
src/modules/
├── config/     # 基本設定
├── keihi/      # 経費管理
├── uriage/     # 売上管理
├── syut/       # 出退勤管理
├── ride/       # 送迎管理
└── tennai/     # 店内状況
```

### コアパターン

1. **CustomID標準化**: `domain:action:target[:id]`形式
2. **InteractionRouter**: イベント駆動ルーティング
3. **Panel Schema**: 宣言的UI定義
4. **BaseConfigManager**: GCS操作の共通化

---

## 開発ガイド

### ドキュメント

- [アーキテクチャガイド](./仕様書/開発者向け/ARCHITECTURE.md) - システム設計とパターン
- [CustomID仕様書](./仕様書/開発者向け/CUSTOMID_SPEC.md) - ID命名規則
- [開発ガイドライン](./仕様書/開発者向け/DEVELOPMENT_GUIDE.md) - コーディング規約とベストプラクティス

### 新機能追加の基本フロー

1. `src/modules/{module}/{feature}/ids.js` でCustomID定義
2. `src/modules/{module}/{feature}/handler.js` でロジック実装
3. `src/modules/{module}/routes/{feature}.js` でRouter登録
4. 必要に応じて`panelSchema.js`でUI定義

詳細は[開発ガイドライン](./仕様書/開発者向け/DEVELOPMENT_GUIDE.md)を参照。

---

## プロジェクト構造

```
nightwork_bot/
├── src/
│   ├── commands/           # スラッシュコマンド
│   ├── events/             # Discordイベントハンドラ
│   ├── modules/            # 機能モジュール
│   ├── structures/         # 共通構造（Router等）
│   └── utils/              # ユーティリティ
├── 仕様書/                 # ドキュメント
│   ├── 開発者向け/
│   └── エンドユーザー向け/
├── scripts/                # デプロイスクリプト等
└── hp/                     # Webページ（オプション）
```

---

## デプロイ

### GitHub Actionsによる自動デプロイ

1. GitHubリポジトリにプッシュ
2. GitHub Actionsが自動的にCloud Runにデプロイ
3. 環境変数はGitHub Secretsで管理

### 手動デプロイ

```bash
# Dockerイメージビルド
docker build -t nightwork-bot .

# Cloud Runにデプロイ
gcloud run deploy nightwork-bot \
  --image gcr.io/PROJECT_ID/nightwork-bot \
  --platform managed \
  --region asia-northeast1
```

---

## テスト

```bash
# ユニットテスト（準備中）
npm test

# 手動テスト
# 開発サーバーで各機能を順番にテスト
```

---

## トラブルシューティング

### よくある問題

**Q: インタラクションが応答しない**
- CustomIDがRouterに登録されているか確認
- `handler.js`でRouterをディスパッチしているか確認
- ログで`Unhandled interaction`を確認

**Q: GCSエラー**
- サービスアカウントキーが正しく設定されているか確認
- バケット名が正しいか確認
- 権限が適切か確認

**Q: デプロイ失敗**
- GitHub Secretsが設定されているか確認
- Dockerfileが正しいか確認

---

## ライセンス

プライベートプロジェクト

---

## 連絡先

開発者: redstar.hr
