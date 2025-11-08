/**
 * ===========================
 * Discord グローバルコマンド登録スクリプト
 * ===========================
 * このスクリプトは GitHub Actions または手動実行で、
 * Cloud Run 環境にデプロイする前にグローバルコマンドを Discord API に登録します。
 * 
 * 対応するコマンド：
 *   /設定_経費
 *   /設定_レベル
 *   /設定_slack通知自動化
 * 
 * コマンドは src/commands ディレクトリから自動的に読み込みます。
 */

const fs = require("fs");
const path = require("path");
const { REST, Routes } = require("discord.js");
require("dotenv").config();

// const __dirname = path.resolve(); // require を使う場合、__dirname はデフォルトで利用可能

// ====== 環境変数の確認 ======
const { DISCORD_TOKEN, CLIENT_ID } = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID) {
  console.error("❌ 環境変数が不足しています。DISCORD_TOKEN と CLIENT_ID を設定してください。");
  process.exit(1);
}

// ====== コマンドフォルダを探索 ======
const commandsDir = path.join(__dirname, "src", "commands");
const commandFiles = fs.readdirSync(commandsDir).filter((file) => file.endsWith(".js"));

// ====== コマンドデータを読み込み ======
const commands = [];
for (const file of commandFiles) {
  const filePath = path.join(commandsDir, file);
  const command = require(filePath);

  if ("data" in command && "execute" in command) {
    commands.push(command.data.toJSON());
    console.log(`🟢 コマンドを登録準備: ${command.data.name}`);
  } else {
    console.warn(`⚠️ 無効なコマンド構造: ${file}`);
  }
}

// ====== Discord REST クライアント初期化 ======
const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

// ====== 登録処理 ======
(async () => {
  try {
    console.log("📡 Discord API へコマンドを登録しています...");
    const data = await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands }
    );

    console.log(`✅ 登録完了: ${data.length} 件のグローバルコマンドを更新しました。`);
    data.forEach((cmd) => console.log(`   - ${cmd.name}`));
  } catch (error) {
    console.error("❌ 登録エラー:", error);
    process.exit(1);
  }
})();
