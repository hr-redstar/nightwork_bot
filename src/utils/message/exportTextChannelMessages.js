// src/handlers/message/exportTextChannelMessages.js
// ----------------------------------------------------
// テキストチャンネルの全メッセージを取得して GCS に日付ごと保存
// ＋ 直近の日付分 JSON を添付して返す
// ----------------------------------------------------

const {
  ChannelType,
  AttachmentBuilder,
  PermissionFlagsBits,
} = require('discord.js');
const logger = require('../../utils/logger');
const { saveChannelMessages } = require('../../utils/logs/gcsMessageLog');

/**
 * 指定テキストチャンネルの全メッセージをファイル化して保存する
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 */
async function exportTextChannelMessages(interaction) {
  const targetChannel =
    interaction.options.getChannel('channel') ?? interaction.channel;

  if (targetChannel.type !== ChannelType.GuildText) {
    return interaction.reply({
      content: '❌ 対象はテキストチャンネルのみ指定できます。',
      ephemeral: true,
    });
  }

  const me = interaction.guild.members.me;
  const perms = targetChannel.permissionsFor(me);

  if (
    !perms ||
    !perms.has(PermissionFlagsBits.ViewChannel) ||
    !perms.has(PermissionFlagsBits.ReadMessageHistory)
  ) {
    return interaction.reply({
      content: '❌ このチャンネルのメッセージ履歴を読む権限がありません。',
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: true });

  const guildId = interaction.guild.id;
  const channelId = targetChannel.id;
  const channelName = targetChannel.name;

  logger.info(
    `[exportTextChannelMessages] 開始: guild=${guildId} channel=${channelId}`,
  );

  // ------------------------------
  // メッセージ全取得（100件ずつページング）
  // ------------------------------
  const messages = [];
  let lastId = null;

  while (true) {
    const fetchOptions = { limit: 100 };
    if (lastId) fetchOptions.before = lastId;

    // 新しい順で最大100件
    const batch = await targetChannel.messages.fetch(fetchOptions);
    if (batch.size === 0) break;

    batch.forEach((m) => messages.push(m));

    // このバッチの一番古いメッセージ ID を基準に次を取得
    const oldest = batch.last();
    lastId = oldest.id;

    // めちゃくちゃ件数が多い場合の安全装置（必要なら上限を調整）
    if (messages.length >= 100000) {
      logger.warn(
        `[exportTextChannelMessages] 取得上限に達したため打ち切り: ${messages.length}件`,
      );
      break;
    }
  }

  if (messages.length === 0) {
    return interaction.editReply(
      `#️⃣ <#${channelId}> には保存するメッセージがありません。`,
    );
  }

  // 古い順にソート
  messages.sort(
    (a, b) => a.createdTimestamp - b.createdTimestamp,
  );

  // ------------------------------
  // プレーンなオブジェクトに変換
  // ------------------------------
  const plainMessages = messages.map((m) => ({
    id: m.id,
    authorId: m.author.id,
    authorName: m.member?.displayName || m.author.username,
    authorTag:
      m.author.tag || `${m.author.username}#${m.author.discriminator}`,
    createdAt: m.createdAt.toISOString(),
    content: m.content,
    attachments: [...m.attachments.values()].map((att) => ({
      id: att.id,
      name: att.name,
      url: att.url,
      size: att.size,
      contentType: att.contentType,
    })),
    // 引用元など、最低限だけ保持（必要なら増やす）
    referencedMessageId: m.reference?.messageId ?? null,
  }));

  // ------------------------------
  // 日付(YYYY-MM-DD)ごとに分割して GCS 保存
  // ------------------------------
  /** @type {Record<string, Array<object>>} */
  const byDate = {};

  for (const msg of plainMessages) {
    const dateKey = msg.createdAt.slice(0, 10); // YYYY-MM-DD
    if (!byDate[dateKey]) byDate[dateKey] = [];
    byDate[dateKey].push(msg);
  }

  const dates = Object.keys(byDate).sort(); // 古い順

  for (const date of dates) {
    await saveChannelMessages(
      guildId,
      channelId,
      channelName,
      date,
      byDate[date],
    );
  }

  // ------------------------------
  // 直近の日付分を JSON 添付で返す
  // ------------------------------
  const latestDate = dates[dates.length - 1];
  const latestPayload = {
    guildId,
    channelId,
    channelName,
    date: latestDate,
    count: byDate[latestDate].length,
    messages: byDate[latestDate],
  };

  const jsonString = JSON.stringify(latestPayload, null, 2);
  const attachment = new AttachmentBuilder(
    Buffer.from(jsonString, 'utf8'),
    {
      name: `messages-${channelName}-${latestDate}.json`,
    },
  );

  await interaction.editReply({
    content: [
      `✅ <#${channelId}> のメッセージを **${messages.length} 件** ファイル化しました。`,
      `- GCS: \`GCS/${guildId}/メッセージログ/${channelId}/YYYY-MM-DD.json\` 形式で日別保存`,
      `- 直近の日付分の JSON を添付しています`,
    ].join('\n'),
    files: [attachment],
  });

  logger.info(
    `[exportTextChannelMessages] 完了: guild=${guildId} channel=${channelId} total=${messages.length}`,
  );
}

module.exports = {
  exportTextChannelMessages,
};