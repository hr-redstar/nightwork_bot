// src/botClient.js
const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');
const logger = require('./utils/logger');

// discord.js v14未満チェック
if (!GatewayIntentBits) {
  console.error('❌ [Fatal] discord.js のバージョンが古すぎます。v14以上が必要です。\n👉 ターミナルで "npm install discord.js@latest" を実行して更新してください。');
  process.exit(1);
}

// Discord クライアント初期化
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,   // メッセージ内容を取得（KPIや出退勤メッセで必要）
    GatewayIntentBits.GuildMembers,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
  ],
});

// コマンドコレクション
client.commands = new Collection();

// 統一エラーハンドリング（再利用しやすい）
client.on('error', (err) => logger.error(`💥 Discordクライアントエラー: ${err.message}`));
client.on('warn', (info) => logger.warn(`⚠️ Discord警告: ${info}`));

module.exports = client;
