// src/utils/keihi/embedLogger.js
// --------------------------------------------------
// 経費申請ログ：申請→修正→承認 を1つのメッセージで管理
// --------------------------------------------------

const { EmbedBuilder } = require("discord.js");
const { loadKeihiConfig, saveKeihiConfig } = require("./keihiConfigManager");

module.exports = {
  /**
   * 初回ログ送信（経費申請）
   */
  async sendKeihiLog(guildId, data) {
    const { client } = global;

    const config = await loadKeihiConfig(guildId);
    const logChId = config.logChannel;
    if (!logChId) return;

    const channel = client.channels.cache.get(logChId);
    if (!channel) return;

    const embed = makeKeihiLogEmbed(data);

    const msg = await channel.send({ embeds: [embed] });

    // threadURL : logMessageId
    config.logs = config.logs || {};
    config.logs[data.url] = msg.id;

    await saveKeihiConfig(guildId, config);
  },

  /**
   * 更新処理（修正/承認）
   */
  async sendKeihiLogUpdate(guildId, data) {
    const { client } = global;
    const config = await loadKeihiConfig(guildId);
    const logChId = config.logChannel;
    if (!logChId) return;

    const channel = client.channels.cache.get(logChId);
    if (!channel) return;

    const logMsgId = config.logs?.[data.threadUrl];
    if (!logMsgId) return;

    let message;
    try {
      message = await channel.messages.fetch(logMsgId);
    } catch {
      return;
    }

    const oldEmbed = message.embeds[0];
    const embed = updateKeihiLogEmbed(oldEmbed, data);

    await message.edit({ embeds: [embed] });
  },
};

// ----------------------------------------------------
// 初回ログ embed（経費申請）
// ----------------------------------------------------
function makeKeihiLogEmbed(data) {
  return new EmbedBuilder()
    .setColor(0x3498db)
    .setDescription(
      [
        "------------------------------",
        `${data.date} の 経費申請しました。`,
        `入力者：<@${data.user}>　入力時間：${data.time}`,
        `修正者：ー　修正時間：ー`,
        `承認者：ー　承認時間：ー`,
        `削除者：ー　削除時間：ー`,
        data.url,
        "------------------------------",
      ].join("\n")
    );
}

// ----------------------------------------------------
// 更新用 embed（修正 / 承認の追記）
// ----------------------------------------------------
function updateKeihiLogEmbed(oldEmbed, data) {
  const text = oldEmbed.description.split("\n");

  // マッピング（行管理）
  const line = {
    header: text[1],       // "日付 の 経費申請しました。"
    input: text[2],        // 入力者
    modify: text[3],       // 修正者
    approve: text[4],      // 承認者
    delete: text[5],       // 削除者
    link: text[6],         // URL
  };

  // 修正時
  if (data.type === "modify") {
    line.modify = `修正者：<@${data.modifyUser}>　修正時間：${data.modifyTime}`;
  }

  // 承認時
  if (data.type === "approve") {
    line.approve = `承認者：<@${data.approveUser}>　承認時間：${data.approveTime}`;
  }

  // 削除時
  if (data.type === "delete") {
    line.delete = `削除者：<@${data.deleteUser}>　削除時間：${data.deleteTime}`;
  }

  return new EmbedBuilder()
    .setColor(0x3498db)
    .setDescription(
      [
        "------------------------------",
        line.header,
        line.input,
        line.modify,
        line.approve,
        line.delete,
        line.link,
        "------------------------------",
      ].join("\n")
    );
}
