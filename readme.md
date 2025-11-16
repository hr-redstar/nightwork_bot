svml　bot(業務改善bot)
環境：google cloud
cloud run
github actions

github 
cloud run

事前準備：.env　にkeyを入力
# 開発/本番環境
NODE_ENV=development

# Discord
DISCORD_TOKEN=
CLIENT_ID=

# Google Cloud
GCS_BUCKET_NAME="your-gcs-bucket-name"
GCS_ENABLED=false
USE_GCS=false
GOOGLE_APPLICATION_CREDENTIALS="./path-to-your-service-account.json"

#　開発用DiscordサーバーID
GUILD_ID=1432111625787277604,1412549933365592127
DEV_GUILD_IDS=1432111625787277604,1412549933365592127

# HP
NEXT_PUBLIC_BASE_URL=https://your-domain.cloud.run
BOT_INTERNAL_URL=http://localhost:8080   # Cloud Run 同一コンテナ内連携

起動：開発時`npm run dev`　本番環境`npm start`
