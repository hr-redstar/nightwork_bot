const { Events } = require('discord.js');
const { handleChatGptThreadMessage } = require('../modules/chat_gpt/execute/threadMessageHandler');
const { handleAnswerChannelMessage } = require('../modules/chat_gpt/execute/answerChannelMessageHandler');
const levelService = require('../modules/level/LevelService');

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    // 1. chat gpt 会話スレッド用の処理を試みる
    // （内部でスレッドかどうかを判定し、対象外なら即座に終了するため、if分岐は不要）
    await handleChatGptThreadMessage(message);

    // 2. 回答チャンネル用の処理を試みる（テキストチャンネルで直接質問したい場合）
    // （こちらも内部で対象チャンネルか判定するため、if分岐は不要）
    await handleAnswerChannelMessage(message);

    // 3. レベルXP処理
    await levelService.handleChatMessage(message);
  },
};