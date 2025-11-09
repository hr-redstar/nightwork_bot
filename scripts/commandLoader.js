const fs = require('fs');
const path = require('path');

/**
 * 指定されたディレクトリからコマンドファイルを再帰的に読み込む
 * @param {string} baseDir - スクリプトのベースディレクトリ (e.g., __dirname)
 * @param {import('../src/utils/logger')} logger - ロギング用のインスタンス
 * @param {string} logPrefix - ログ出力時のプレフィックス (e.g., '[DeployGlobal]')
 * @returns {Array<object>} - 読み込まれたコマンドデータの配列
 */
function loadCommands(baseDir, logger, logPrefix) {
  const commands = [];
  const commandsPath = path.join(baseDir, '..', 'src', 'commands');

  const loadRecursively = (dir) => {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
      const filePath = path.join(dir, file.name);
      if (file.isDirectory()) {
        loadRecursively(filePath);
      } else if (file.name.endsWith('.js')) {
        const command = require(filePath);
        if (command.data) {
          commands.push(command.data.toJSON());
          logger.info(`${logPrefix} コマンドを読み込みました: ${command.data.name}`);
        }
      }
    }
  };

  loadRecursively(commandsPath);
  return commands;
}

module.exports = { loadCommands };