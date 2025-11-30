// src/handlers/chat_gpt/threadMessageHandler.js
// ----------------------------------------------------
// chat gpt 会話スレッド内のメッセージに反応して
//   - ログ蓄積を読み込む
//   - コンテキストを作る
//   - OpenAI に投げて返信
//   - ログに追記
// ----------------------------------------------------

const logger = require('../../utils/logger');
const {
  loadAnswerChannels,
  loadChatGptConfig,
  loadTodaySettings,
  loadUsage,
  saveUsage,
} = require('../../utils/chat_gpt/gcsChatGptManager');
const {
  loadThreadLog,
  appendThreadMessage,
  buildThreadContext,
  updateSummaryIfNeeded,
} = require('../../utils/chat_gpt/chatGptThreadLogManager');
const { buildGuildAllChannelMessageLogContext, buildThreadMessageLogContextForGuild } = require('../../utils/chat_gpt/messageLogContext');

let OpenAI = null;
try {
  OpenAI = require('openai');
} catch (err) {
  logger.warn('[threadMessageHandler] openai パッケージが見つかりません。`npm i openai` が必要です。');
}

// 口調レベル
function toneDescription(toneLevel) {
  switch (toneLevel) {
    case 0: return '少し固めで敬語ベースの口調で話してください。';
    case 2: return 'かなり柔らかく、親しみやすい口調で話してください。';
    case 1:
    default: return '丁寧だが堅すぎない、自然な口調で話してください。';
  }
}

// 使用率加算（回答チャンネル側と同じイメージ）
async function addUsage(guildId, apiKey, model, totalTokens) {
  try {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const usage = await loadUsage(guildId, yearMonth);

    const keyId = `key_${apiKey.slice(-8)}`;

    if (!usage[keyId]) {
      usage[keyId] = { models: {}, totalTokens: 0, calls: 0 };
    }

    const entry = usage[keyId];
    entry.totalTokens += totalTokens || 0;
    entry.calls += 1;

    if (!entry.models[model]) {
      entry.models[model] = { tokens: 0, calls: 0 };
    }
    entry.models[model].tokens += totalTokens || 0;
    entry.models[model].calls += 1;

    await saveUsage(guildId, yearMonth, usage);
  } catch (err) {
    logger.error('[threadMessageHandler] 使用率保存エラー:', err);
  }
}

/**
 * chat gpt 会話スレッド用メッセージハンドラ
 * @param {import('discord.js').Message} message
 */
async function handleChatGptThreadMessage(message) {
  try {
    if (message.author.bot) return;
    if (!message.guild) return;

    const channel = message.channel;
    if (!channel.isThread?.()) return;                 // スレッド以外は無視
    if (!channel.parentId) return;

    const guildId = message.guild.id;
    const threadId = channel.id;
    const parentChannelId = channel.parentId;

    // このスレッドが「chat gpt会話スレッド」か確認（ログがあるかどうかで判定）
    const log = await loadThreadLog(guildId, threadId);
    if (!log) return; // chatgpt用に init されてないスレッドは無視

    if (!OpenAI) {
      await message.reply('⚠️ ChatGPT クライアントが正しく設定されていません。（openai パッケージ未インストール）');
      return;
    }

    // 回答チャンネル設定から APIキー & 店舗名取得
    const answerChannels = await loadAnswerChannels(guildId);
    const answerEntry = answerChannels.find((c) => c.channelId === parentChannelId);
    if (!answerEntry) {
      await message.reply('⚠️ このスレッドの親チャンネルは ChatGPT回答チャンネルとして設定されていません。');
      return;
    }

    const apiKey = answerEntry.apiKey;
    const storeName = answerEntry.storeName || '店舗名未設定';

    // config / 今日の設定（モデル・口調・最大文字数など）
    const baseConfig = await loadChatGptConfig(guildId);
    const defaultModel = baseConfig.defaultModel || 'gpt-4.1-mini';
    const defaultMaxTokens = baseConfig.defaultMaxTokens || 800;
    const defaultToneLevel =
      typeof baseConfig.defaultToneLevel === 'number' ? baseConfig.defaultToneLevel : 1;

    const todaySettings = await loadTodaySettings(guildId);
    const todayEntry =
      todaySettings.find((s) => s.channelId === parentChannelId) ||
      todaySettings.find((s) => s.storeId && s.storeId === answerEntry.storeId) ||
      null;

    const model = todayEntry?.model || defaultModel;
    const extraPrompt = todayEntry?.prompt || baseConfig.defaultPrompt || '';
    const toneLevel =
      typeof todayEntry?.toneLevel === 'number' ? todayEntry.toneLevel : defaultToneLevel;
    const maxTokens = todayEntry?.maxTokens || defaultMaxTokens;

    // ギルド全体のチャンネルログとスレッドログを両方読み込む
    const guildChannelLogs = await buildGuildAllChannelMessageLogContext(guildId, { maxChars: 6000 });
    const threadLogTextForGuild = await buildThreadMessageLogContextForGuild(guildId, { maxChars: 6000 });

    // デバッグ用にログの長さを出力
    logger.info(
      `[threadMessageHandler] [DEBUG] guildChannelLogs: ${guildChannelLogs.length} chars, guildThreadLog: ${threadLogTextForGuild.length} chars`
    );

    // スレッドログからコンテキスト生成
    const context = await buildThreadContext(guildId, threadId, 30); // 直近30件
    const basePrompt = context?.basePrompt || log.basePrompt || '';
    const summary = context?.summary || '';
    const recentMessages = context?.recentMessages || [];

    // 今回のユーザーメッセージをログに追加（先に追加しておく）
    const userContent = message.content || '';
    await appendThreadMessage(guildId, {
      threadId,
      channelId: parentChannelId,
      ownerId: log.ownerId,
      basePrompt,
      role: 'user',
      authorId: message.author.id,
      content: userContent,
      timestamp: new Date().toISOString(),
      messageId: message.id,
    });

    const client = new OpenAI({ apiKey });

    const toneText = toneDescription(toneLevel);

    const systemPieces = [
      `あなたはナイトワーク店舗「${storeName}」の黒服スタッフです。`,
      'このスレッドは特定のユーザーとの継続的な会話専用です。',
      'これから渡すメッセージログは、すでに保存されている店舗内のデータです。',
      '「過去データにアクセスできない」などとは言わず、渡されたログの範囲でできる限り具体的に答えてください。',
      toneText,
      '返答は日本語で行ってください。',
    ];
    if (basePrompt) {
      systemPieces.push('基本プロンプト:');
      systemPieces.push(basePrompt);
    }
    if (extraPrompt) {
      systemPieces.push('追加プロンプト:');
      systemPieces.push(extraPrompt);
    }

    const systemPrompt = systemPieces.join('\n');

    const messagesForModel = [
      { role: 'system', content: systemPrompt },
    ];

    // ギルド全体のチャンネルログをコンテキストに追加
    if (guildChannelLogs) {
      messagesForModel.push({
        role: 'system',
        content:
          '以下は、このギルド内で /メッセージファイル化 によって保存されている全チャンネルのメッセージログです。\n' +
          'ユーザーが「保存されている内容を回答して」と言った場合は、このログから要約・抜粋して回答してください。\n' +
          guildChannelLogs,
      });
    }
    // ギルド共通スレッドログをコンテキストに追加
    if (threadLogTextForGuild) {
      messagesForModel.push({
        role: 'system',
        content:
          '以下は、このギルド内で /スレッドメッセージ化 によって保存されているスレッドメッセージログです。\n' +
          'ユーザーが「保存されている内容」について質問した場合は、このログも参考にしてください。\n' +
          threadLogTextForGuild,
      });
    }

    // ギルド共通スレッドログをコンテキストに追加
    if (threadLogTextForGuild) {
      messagesForModel.push({
        role: 'system',
        content:
          '以下は、このギルド内で /スレッドメッセージ化 によって保存されているスレッドメッセージログです。\n' +
          'ユーザーが「保存されている内容」について質問した場合は、このログも参考にしてください。\n' +
          threadLogTextForGuild,
      });
    }

    if (summary) {
      messagesForModel.push({
        role: 'system',
        content: `これまでの会話要約:\n${summary}`,
      });
    }

    // 直近の会話履歴を user/assistant にマッピング
    for (const m of recentMessages) {
      if (!m || !m.content) continue;
      const role =
        m.role === 'assistant' || m.role === 'system' || m.role === 'user'
          ? m.role
          : 'user';
      messagesForModel.push({
        role,
        content: m.content,
      });
    }

    // 今回のユーザー発言
    messagesForModel.push({
      role: 'user',
      content: userContent,
    });

    const completion = await client.chat.completions.create({
      model,
      messages: messagesForModel,
      max_tokens: maxTokens,
    });

    const replyText = completion.choices?.[0]?.message?.content?.trim();
    if (!replyText) {
      await message.reply('⚠️ ChatGPT から有効な応答を取得できませんでした。');
      return;
    }

    const replyMsg = await message.reply(replyText);

    // assistant 側のメッセージもログに追加
    await appendThreadMessage(guildId, {
      threadId,
      channelId: parentChannelId,
      ownerId: log.ownerId,
      basePrompt,
      role: 'assistant',
      authorId: null,
      content: replyText,
      timestamp: new Date().toISOString(),
      messageId: replyMsg.id,
    });

    // 必要なら要約を更新（ログが増えすぎたときだけ summarize）
    await updateSummaryIfNeeded(
      guildId,
      threadId,
      async (oldSummary, targetMessages) => {
        // ここはざっくり要約用プロンプト
        const summaryClient = new OpenAI({ apiKey });
        const summaryPrompt =
          '以下はこれまでの会話ログの一部です。今後の会話のために、重要な情報だけを簡潔に日本語で要約してください。\n\n' +
          targetMessages.map((m) => `${m.role}: ${m.content}`).join('\n');

        const sumRes = await summaryClient.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: 'あなたは会話履歴を要約するアシスタントです。' },
            { role: 'user', content: summaryPrompt },
          ],
          max_tokens: 400,
        });

        const newSummary = sumRes.choices?.[0]?.message?.content?.trim() || '';
        return oldSummary ? `${oldSummary}\n${newSummary}` : newSummary;
      },
      200 // しきい値
    );

    const totalTokens = completion.usage?.total_tokens || 0;
    await addUsage(guildId, apiKey, model, totalTokens);
  } catch (err) {
    logger.error('[threadMessageHandler] エラー:', err);
    try {
      await message.reply('⚠️ chat gptスレッドでの応答中にエラーが発生しました。');
    } catch {
      // ignore
    }
  }
}

module.exports = {
  handleChatGptThreadMessage,
};
