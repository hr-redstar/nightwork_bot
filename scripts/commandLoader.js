const fs = require('fs');
const path = require('path');

/**
 * 指定ディレクトリ配下のスラッシュコマンドを再帰的に読み込み
 * @param {string} baseDir - スクリプトのベースディレクトリ (e.g., __dirname)
 * @param {import('../utils/logger')} logger - ロギング用インスタンス
 * @param {string} logPrefix - ログ出力用のプレフィックス (例: "[DeployGuild]")
 * @returns {Array<object>} 読み込まれたコマンドデータ配列
 */
function loadCommands(baseDir, logger, logPrefix = '[CommandLoader]') {
  const commands = [];
  const commandsPath = path.join(baseDir, '..', 'src', 'commands');

  // --- 存在確認 ---
  if (!fs.existsSync(commandsPath)) {
    logger.warn(`${logPrefix} コマンドディレクトリが存在しません: ${commandsPath}`);
    return [];
  }

  /**
   * ディレクトリを再帰的に走査して command.data を読み込む
   * @param {string} dir
   */
  const loadRecursively = (dir) => {
    const files = fs.readdirSync(dir, { withFileTypes: true });

    for (const file of files) {
      const filePath = path.join(dir, file.name);

      if (file.isDirectory()) {
        loadRecursively(filePath);
        continue;
      }

      if (!file.name.endsWith('.js')) continue;

      try {
        const command = require(filePath);

        if (command?.data) {
          commands.push(command.data.toJSON());
        } else {
          logger.warn(`${logPrefix} ⚠️ data未定義コマンド: ${file.name}`);
        }
      } catch (err) {
        logger.error(`${logPrefix} ❌ コマンド読み込み失敗: ${file.name}`, err);
      }
    }
  };

  loadRecursively(commandsPath);
  logger.info(`${logPrefix} 📦 合計 ${commands.length} 件のコマンドをロード完了`);
  return commands;
}

module.exports = { loadCommands };