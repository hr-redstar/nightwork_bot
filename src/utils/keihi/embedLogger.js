// src/utils/keihi/embedLogger.js
// ----------------------------------------------------
// 経費機能向け ログ出力ヘルパー
//   - 設定ログ
//   - 管理者ログ
//   - コマンドログ
//
// 参照順（keihi優先）
//  1) GCS/{guildId}/keihi/config.json（存在すれば）
//  2) GCS/{guildId}/config/config.json（共通設定）
//
// ✅ 追加
//  - 共通設定と keihi 設定をマージ（keihi優先）
//  - 管理者ログ embed カラーを action / 文言から推定して切替
//    申請/修正=青、承認=緑、削除=赤
//  - adminLogChannelId が無い場合に備え、複数キーをフォールバックで探索
// ----------------------------------------------------

const { EmbedBuilder } = require('discord.js');
const gcs = require('../gcs');
const { getKeihiGlobalConfigPath } = require('./keihiConfigManager');
const { getGuildConfig } = require('../config/gcsConfigManager');
const logger = require('../logger');

// ----------------------------------------------------
// 色：申請/修正=青、承認=緑、削除=赤
// ----------------------------------------------------
const COLORS = {
  BLUE: 0x5865f2,
  GREEN: 0x57f287,
  RED: 0xed4245,
};

// ----------------------------------------------------
// 内部：設定読み込み（共通 + keihi をマージ）
// ----------------------------------------------------
async function loadCommonConfig(guildId) {
  try {
    return (await getGuildConfig(guildId).catch(() => ({}))) || {};
  } catch (err) {
    logger.error('[keihi/embedLogger] 共通 config 読み込みエラー:', err);
    return {};
  }
}

async function loadKeihiConfig(guildId) {
  try {
    const common = (await loadCommonConfig(guildId).catch(() => ({}))) || {};
    const keihi =
      (await gcs.readJSON(getKeihiGlobalConfigPath(guildId)).catch(() => ({}))) || {};
    return { ...common, ...keihi }; // keihi config overrides common config
  } catch (err) {
    logger.error('[keihi/embedLogger] 経費 config 読み込みエラー:', err);
    return {};
  }
}

function getValue(obj, path) {
  try {
    return path.split('.').reduce((a, k) => (a && a[k] != null ? a[k] : undefined), obj);
  } catch {
    return undefined;
  }
}

function pickFirst(...vals) {
  for (const v of vals) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

/**
 * ✅ kindLogChannelId が無いケースを救済するフォールバック探索
 * 想定される例：
 * - adminLogChannelId
 * - adminLog.channelId / adminLog.threadId
 * - logChannels.admin.channelId / logChannels.admin.threadId
 * - logs.admin.channelId / logs.admin.threadId
 */
function resolveLogTargets(config, kind) {
  // 標準キー
  const ch1 = config?.[`${kind}LogChannelId`];
  const th1 = config?.[`${kind}LogThreadId`];

  // よくある別名パターン（ネスト/別キー）
  const baseObj = pickFirst(
    // object 参照（channelId/threadIdを持つ）
    getValue(config, `${kind}Log`), // { channelId, threadId }
    getValue(config, `logs.${kind}`),
    getValue(config, `logChannels.${kind}`),
  );

  // baseObj が文字列だったら無視（上の pickFirst は string 用なので使わない）
  const objCandidates = [
    getValue(config, `${kind}Log`),
    getValue(config, `logs.${kind}`),
    getValue(config, `logChannels.${kind}`),
    getValue(config, `${kind}LogChannel`),
  ].filter((v) => v && typeof v === 'object');

  const obj = objCandidates[0] || null;

  const ch2 =
    (obj && (obj.channelId || obj.channelID || obj.channel)) ||
    getValue(config, `${kind}LogChannelId`) ||
    getValue(config, `${kind}ChannelId`) ||
    getValue(config, `${kind}LogChannel`);

  const th2 =
    (obj && (obj.threadId || obj.threadID || obj.thread)) ||
    getValue(config, `${kind}LogThreadId`) ||
    getValue(config, `${kind}ThreadId`) ||
    getValue(config, `${kind}LogThread`);

  // admin 専用の別名も追加で見る
  if (kind === 'admin') {
    const chAdmin = pickFirst(
      ch1,
      ch2,
      getValue(config, 'adminLogChannelId'),
      getValue(config, 'admin.channelId'),
      getValue(config, 'logs.admin.channelId'),
      getValue(config, 'logChannels.admin.channelId'),
      getValue(config, 'adminLog.channelId'),
      getValue(config, 'adminLogChannel'),
    );
    const thAdmin = pickFirst(
      th1,
      th2,
      getValue(config, 'adminLogThreadId'),
      getValue(config, 'admin.threadId'),
      getValue(config, 'logs.admin.threadId'),
      getValue(config, 'logChannels.admin.threadId'),
      getValue(config, 'adminLog.threadId'),
      getValue(config, 'adminLogThread'),
    );
    return { channelId: chAdmin, threadId: thAdmin };
  }

  return {
    channelId: pickFirst(ch1, ch2),
    threadId: pickFirst(th1, th2),
  };
}

// ----------------------------------------------------
// 内部：embed送信共通
// ----------------------------------------------------
async function sendLogEmbed(guild, kind, payload) {
  if (!guild) {
    logger.warn('[keihi/embedLogger] guild が未定義のためログ送信をスキップしました');
    return null;
  }

  const guildId = guild.id;
  const config = await loadKeihiConfig(guildId);

  const { content = '', embeds = [], components = [], replyToMessageId = null } = payload || {};

  const { channelId, threadId } = resolveLogTargets(config, kind);

  if (!channelId) {
    logger.warn(`[keihi/embedLogger] ${kind}LogChannelId が未設定です (guildId=${guildId})`);
    return null;
  }

  try {
    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      logger.warn(`[keihi/embedLogger] ログチャンネル取得失敗: ${channelId} (guildId=${guildId})`);
      return null;
    }

    // ✅ ②：①のログに返信
    if (replyToMessageId) {
      const target = await channel.messages.fetch(replyToMessageId).catch(() => null);
      if (target) {
        return await target.reply({ content, embeds, components }).catch(() => null);
      }
    }

    // スレッド優先
    if (threadId) {
      const thread = await guild.channels.fetch(threadId).catch(() => null);
      if (thread && thread.isThread()) {
        return await thread.send({ content, embeds, components }).catch(() => null);
      }
      logger.warn(`[keihi/embedLogger] ログスレッドが見つからないかスレッドではありません: ${threadId}`);
    }

    // 通常送信
    return await channel.send({ content, embeds, components }).catch(() => null);
  } catch (err) {
    logger.error('[keihi/embedLogger] ログ送信エラー:', err);
    return null;
  }
}

// ----------------------------------------------------
// 内部：Embed生成
// ----------------------------------------------------
function buildBaseEmbed(interaction, { title, description, fields, color } = {}) {
  const embed = new EmbedBuilder()
    .setTitle(title || 'ログ')
    .setDescription(description || '')
    .setColor(color ?? COLORS.BLUE)
    .setTimestamp();

  if (interaction?.user) {
    const avatar =
      typeof interaction.user.displayAvatarURL === 'function'
        ? interaction.user.displayAvatarURL()
        : undefined;

    embed.setFooter({
      text: `実行者: ${interaction.user.tag}`,
      iconURL: avatar,
    });
  }

  if (Array.isArray(fields) && fields.length) {
    embed.addFields(fields);
  }

  return embed;
}

// payload.embeds を渡された場合でも色を合わせたい時用（上書き）
function applyColorToEmbeds(embeds, color) {
  if (!Array.isArray(embeds) || !color) return embeds;

  return embeds.map((e) => {
    try {
      if (e instanceof EmbedBuilder) {
        e.setColor(color);
        return e;
      }
      const b = EmbedBuilder.from(e);
      b.setColor(color);
      return b;
    } catch {
      return e;
    }
  });
}

// 管理者ログの色を action / 文字列から推定
function inferAdminColor(payload) {
  const raw =
    String(payload?.action || payload?.adminAction || '') +
    ' ' +
    String(payload?.title || '') +
    ' ' +
    String(payload?.description || '') +
    ' ' +
    String(payload?.content || '');

  const a = raw.toUpperCase();

  if (a.includes('APPROVE') || raw.includes('承認')) return COLORS.GREEN;
  if (a.includes('DELETE') || raw.includes('削除')) return COLORS.RED;
  if (a.includes('MODIFY') || raw.includes('修正')) return COLORS.BLUE;
  if (a.includes('REQUEST') || raw.includes('申請')) return COLORS.BLUE;

  return null;
}

// ----------------------------------------------------
// 外部公開関数
// ----------------------------------------------------
async function sendCommandLog(interaction, payload = {}) {
  const embeds = [buildBaseEmbed(interaction, payload)];
  return await sendLogEmbed(interaction.guild, 'command', { ...payload, embeds });
}

async function sendSettingLog(interaction, payload = {}) {
  const embeds = [buildBaseEmbed(interaction, { color: 0x00b894, ...payload })];
  return await sendLogEmbed(interaction.guild, 'setting', { ...payload, embeds });
}

async function sendAdminLog(interaction, payload = {}) {
  // ✅ 管理者ログの色決定（優先順位：payload.color > 推定）
  const decidedColor = payload.color ?? inferAdminColor(payload);

  let embeds =
    payload.embeds ||
    [
      buildBaseEmbed(interaction, {
        color: decidedColor ?? COLORS.RED,
        ...payload,
      }),
    ];

  if (decidedColor) embeds = applyColorToEmbeds(embeds, decidedColor);

  return await sendLogEmbed(interaction.guild, 'admin', { ...payload, embeds });
}

module.exports = {
  COLORS,
  sendCommandLog,
  sendSettingLog,
  sendAdminLog,
};
