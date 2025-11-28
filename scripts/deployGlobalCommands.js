/**
 * ===========================
 * Discord グローバルコマンド登録/更新スクリプト
 * ===========================
 * このスクリプトは、本番環境向けにグローバルコマンドをDiscord APIに一括登録・更新します。
 * `src/commands` ディレクトリ配下の全コマンドファイルを再帰的に読み込み、
 * Discordアプリケーションに紐づくすべてのコマンドを上書きします。
 * 実行コマンド: `npm run deploy:global`
 */

const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
require('dotenv').config();
const logger = require('../src/utils/logger');
const { loadCommands } = require('./commandLoader');

// ====== 環境変数の確認 ======
const { DISCORD_TOKEN, CLIENT_ID } = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID) {
  logger.error('❌ 環境変数が不足しています。DISCORD_TOKEN と CLIENT_ID を設定してください。');
  process.exit(1);
}

// ====== コマンドフォルダを探索 ======
const commands = loadCommands(__dirname, logger, '[DeployGlobal]');

if (commands.length === 0) {
  logger.warn('📜 登録対象のグローバルコマンドが見つからなかったため、処理を終了します。');
  process.exit(0);
}

// ====== Discord REST クライアント初期化 ======
const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

// ====== 登録処理 ======
(async () => {
  try {
    logger.info(`📡 ${commands.length}個のグローバルコマンドをDiscord APIへ登録します...`);

    const data = await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });

    logger.info(`✅ 登録完了: ${data.length} 件のグローバルコマンドを更新しました。`);
  } catch (error) {
    logger.error('❌ グローバルコマンドの登録エラー:', error);
    process.exit(1);
  }
})();
