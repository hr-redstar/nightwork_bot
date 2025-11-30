// src/handlers/chat_gpt/conversationThreadMessageHandler.js
// ----------------------------------------------------
// ChatGPT「会話スレッド」でユーザーが発言したら
// スレッド専用の会話ログを読み込んで返信させる
// ----------------------------------------------------

const logger = require('../../utils/logger');
const {
  loadThreadLog,
  saveThreadLog,
} = require('../../utils/chat_gpt/chatGptThreadLogManager');

// OpenAI SDK（未インストールならログ出して終了）
let OpenAI = null;
try {
  OpenAI = require('openai');
} catch (err) {
  logger.warn(
    '[conversationThreadMessageHandler] openai パッケージが見つかりません。`npm i openai` を実行してください。'
  );
}

/**
 * このメッセージが「ChatGPT会話スレッド」内であれば応答を生成する
 * @param {import('discord.js').Message} message
 */
async function handleConversationThreadMessage(message) {
  // 自分自身 / Bot のメッセージには反応しない
  if (message.author.bot) return false;
  if (!message.guild || !message.channel.isThread?.()) return false;

  const guildId = message.guild.id;
  const threadId = message.channel.id;

  // スレッドの会話ログを読み込む
  const threadLog = await loadThreadLog(guildId, threadId);
  // ログが存在しない、またはAPIキーがなければ、このスレッドは対象外
  if (!threadLog || !threadLog.apiKey) return false;

  if (!OpenAI) {
    await message.reply(
      '⚠️ ChatGPT クライアントが正しく設定されていません。（openai パッケージ未インストール）'
    );
    return true;
  }

  try {
    await message.channel.sendTyping();

    const client = new OpenAI({ apiKey: threadLog.apiKey });

    // 過去の会話履歴を messages 配列に変換
    const messages = [
      { role: 'system', content: threadLog.basePrompt },
      ...threadLog.messages,
      { role: 'user', content: message.content },
    ];

    // ChatGPT 呼び出し
    const completion = await client.chat.completions.create({
      model: threadLog.model || 'gpt-4.1-mini', // ログにモデルがなければデフォルト
      messages,
      max_tokens: threadLog.maxTokens || 800,
    });

    const replyText = completion.choices?.[0]?.message?.content?.trim();
    if (!replyText) {
      await message.reply('⚠️ ChatGPT から有効な応答を取得できませんでした。');
      return true;
    }

    // 会話ログを更新
    threadLog.messages.push({ role: 'user', content: message.content });
    threadLog.messages.push({ role: 'assistant', content: replyText });

    // 古い履歴を削除（例: 直近20件を残す）
    if (threadLog.messages.length > 20) {
      threadLog.messages.splice(0, threadLog.messages.length - 20);
    }

    await saveThreadLog(guildId, threadId, threadLog);

    await message.reply(replyText);
    return true; // 処理済み
  } catch (err) {
    logger.error('[conversationThreadMessageHandler] エラー:', err);
    try {
      await message.reply('⚠️ ChatGPT応答中にエラーが発生しました。');
    } catch {
      // ignore
    }
    return true; // エラーでも処理済みとする
  }
}

module.exports = {
  handleConversationThreadMessage,
};