// src/utils/chat_gpt/messageLogContext.js
// ----------------------------------------------------
// /メッセージファイル化（チャンネル）
// /スレッドメッセージ化（スレッド）
// のログを ChatGPT 用テキストにまとめる
// ----------------------------------------------------

const gcs = require('../gcs');
const logger = require('../logger');

/**
 * 共通: JSON 1件を "日時 ユーザー: 内容" に整形
 */
function formatJsonLog(json) {
  let lines = [];

  const pushLine = (entry) => {
    if (!entry) return;
    const time =
      entry.timestamp ||
      entry.createdAt ||
      entry.time ||
      entry.date ||
      '';
    const author =
      entry.authorName ||
      entry.author ||
      entry.userName ||
      entry.user ||
      '';
    const content = entry.content || entry.message || '';

    const header = [time, author].filter(Boolean).join(' ');
    if (header || content) {
      lines.push(`${header}: ${content}`.trim());
    }
  };

  if (Array.isArray(json)) {
    for (const e of json) {
      if (typeof e === 'string') {
        lines.push(e);
      } else if (typeof e === 'object' && e !== null) {
        pushLine(e);
      }
    }
  } else if (typeof json === 'object' && json !== null) {
    if (Array.isArray(json.messages)) {
      for (const e of json.messages) pushLine(e);
    } else {
      // よくわからない形式は stringify して1行
      lines.push(JSON.stringify(json));
    }
  } else if (typeof json === 'string') {
    lines.push(json);
  }

  return lines.join('\n');
}

/**
 * -----------------------------
 * ① チャンネルメッセージログ（/メッセージファイル化）
 * -----------------------------
 * @param {string} guildId
 * @param {string} channelId
 * @param {{ maxChars?: number }} [options]
 * @returns {Promise<string>} ChatGPT に渡す用のテキスト
 */
async function buildChannelMessageLogContext(guildId, channelId, options = {}) {
  const { maxChars = 8000 } = options;
  const prefix = `${guildId}/メッセージログ/${channelId}/`;
  logger.info(`[messageLogContext] [DEBUG] buildChannelMessageLogContext: Reading from prefix: "${prefix}"`);

  try {
    const files = await gcs.listFiles(prefix);
    logger.info(`[messageLogContext] [DEBUG] listFiles for channel log returned ${files?.length || 0} files.`);
    if (files && files.length > 0) {
      logger.info(`[messageLogContext] [DEBUG] First 5 files:`, files.slice(0, 5));
    }
    if (!files || files.length === 0) {
      return '（チャンネルのメッセージログはまだ保存されていません）';
    }

    const sorted = [...files].sort(); // 古い順
    const parts = [];

    for (const filePath of sorted) {
      if (!filePath.endsWith('.json') && !filePath.endsWith('.txt')) continue;

      try {
        if (filePath.endsWith('.json')) {
          const json = await gcs.readJSON(filePath);
          const text = formatJsonLog(json);
          if (text) parts.push(`--- ${filePath} ---\n${text}`);
        } else {
          const buf = await gcs.readFile(filePath);
          if (!buf) continue;
          const text = buf.toString('utf-8');
          parts.push(`--- ${filePath} ---\n${text}`);
        }
      } catch (err) {
        logger.warn('[messageLogContext] チャンネルログ読み込み失敗:', filePath, err);
      }
    }

    let joined = parts.join('\n\n');
    if (joined.length > maxChars) {
      joined = joined.slice(joined.length - maxChars); // 後ろだけ残す
    }
    return joined || '（チャンネルのメッセージログはまだ保存されていません）';
  } catch (err) {
    logger.error('[messageLogContext] チャンネルログ構築エラー:', err);
    return '（チャンネルのメッセージログ読み込み中にエラーが発生しました）';
  }
}

/**
 * -----------------------------
 * ② スレッドメッセージログ（/スレッドメッセージ化）
 *    → ギルド全体のスレッドを対象にまとめる
 * -----------------------------
 * @param {string} guildId
 * @param {{ maxChars?: number }} [options]
 * @returns {Promise<string>}
 */
async function buildThreadMessageLogContextForGuild(guildId, options = {}) {
  const { maxChars = 8000 } = options;
  const basePrefix = `${guildId}/スレッドメッセージログ/`;
  logger.info(`[messageLogContext] [DEBUG] buildThreadMessageLogContextForGuild: Reading from basePrefix: "${basePrefix}"`);

  try {
    const allFiles = await gcs.listFiles(basePrefix);
    logger.info(`[messageLogContext] [DEBUG] listFiles for all thread logs returned ${allFiles?.length || 0} files.`);
    if (!allFiles || allFiles.length === 0) {
      return '（スレッドメッセージログはまだ保存されていません）';
    }

    // パスからスレッドIDを抽出し、ユニークなディレクトリ名を取得
    const threadDirs = [...new Set(allFiles.map(file => file.split('/')[1]).filter(Boolean))];
    logger.info(`[messageLogContext] [DEBUG] Found unique thread directories:`, threadDirs);

    const parts = [];

    for (let dir of threadDirs) {
      // ローカルモード: dir = "threadId"
      // GCSモード: dir = "GCS/xxx/スレッドメッセージログ/threadId/"
      let threadId = dir;
      let prefix;

      if (dir.startsWith(basePrefix)) {
        // すでにフルパスっぽい場合
        prefix = dir;
        threadId = dir.replace(basePrefix + '/', '').replace(/\/$/, '');
      } else {
        prefix = `${basePrefix}/${dir}/`;
      }

      const files = await gcs.listFiles(prefix);
      const sorted = [...files].sort();

      for (const filePath of sorted) {
        if (!filePath.endsWith('.json') && !filePath.endsWith('.txt')) continue;

        try {
          if (filePath.endsWith('.json')) {
            const json = await gcs.readJSON(filePath);
            const text = formatJsonLog(json);
            if (text) parts.push(`--- thread:${threadId} ${filePath} ---\n${text}`);
          } else {
            const buf = await gcs.readFile(filePath);
            if (!buf) continue;
            const text = buf.toString('utf-8');
            parts.push(`--- thread:${threadId} ${filePath} ---\n${text}`);
          }
        } catch (err) {
          logger.warn('[messageLogContext] スレッドログ読み込み失敗:', filePath, err);
        }
      }
    }

    let joined = parts.join('\n\n');
    if (joined.length > maxChars) {
      joined = joined.slice(joined.length - maxChars);
    }

    return joined || '（スレッドメッセージログはまだ保存されていません）';
  } catch (err) {
    logger.error('[messageLogContext] スレッドログ構築エラー:', err);
    return '（スレッドメッセージログ読み込み中にエラーが発生しました）';
  }
}

/**
 * -----------------------------
 * ③ ギルド全体のチャンネルメッセージログ（/メッセージファイル化）
 *    → ギルド内の全チャンネルを対象にまとめる
 * -----------------------------
 * @param {string} guildId
 * @param {{ maxChars?: number }} [options]
 * @returns {Promise<string>}
 */
async function buildGuildAllChannelMessageLogContext(guildId, options = {}) {
  const { maxChars = 8000 } = options;
  const basePrefix = `${guildId}/メッセージログ/`;

  const channelDirs = await gcs.listFiles(basePrefix, { directoriesOnly: true });
  if (!channelDirs || channelDirs.length === 0) {
    return '（ギルド全体のメッセージログはまだ保存されていません）';
  }

  const parts = [];

  for (const dir of channelDirs) {
    const prefix = `${basePrefix}${dir}/`;
    const files = await gcs.listFiles(prefix);
    const sorted = [...files].sort();

    for (const filePath of sorted) {
      if (filePath.endsWith('.json')) {
        const json = await gcs.readJSON(filePath);
        const text = formatJsonLog(json);
        if (text) parts.push(`[${dir}] --- ${filePath} ---\n${text}`);
      }
    }
  }

  let joined = parts.join('\n\n');
  if (joined.length > maxChars) {
    joined = joined.slice(joined.length - maxChars);
  }

  return joined;
}

module.exports = {
  buildChannelMessageLogContext,
  buildThreadMessageLogContextForGuild,
  buildGuildAllChannelMessageLogContext,
};