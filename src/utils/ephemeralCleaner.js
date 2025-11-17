/**
 * ephemeralCleaner.js
 * 一部のephemeralメッセージを指定秒数後に削除
 */
const logger = require('./logger');

async function scheduleEphemeralDelete(interaction, delaySec = 30) {
  try {
    const msg = await interaction.fetchReply().catch(() => null);
    if (!msg) return;

    setTimeout(async () => {
      try {
        await msg.delete().catch(() => {});
        logger.debug(`[ephemeralCleaner] 削除: messageId=${msg.id}`);
      } catch (_) {}
    }, delaySec * 1000);
  } catch (_) {}
}

module.exports = { scheduleEphemeralDelete };


//===使いたい場所だけ opt-in で削除==================================
//const { scheduleEphemeralDelete } = require('../utils/ephemeralCleaner');
//
//await interaction.reply({
//  content: '⚠️ 入力に誤りがあります。',
//  ephemeral: true,
//});

// この行を追加すると 30秒後に削除
//scheduleEphemeralDelete(interaction, 30);

//await interaction.reply({
//  content: '✅ 登録完了しました！',
//  ephemeral: true,
//});

//scheduleEphemeralDelete(interaction, 15);
//=========================================================
