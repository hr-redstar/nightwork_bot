/**
 * 既存パネルを最も安全で可能な方法で上書き更新するユーティリティ
 */
const logger = require('./logger');

/**
 * @typedef {Object} UpdateOptions
 * @property {boolean} [ephemeralOnFail=true] 失敗時のephemeral返信を行うか
 * @property {object}  [allowedMentions={parse:[]}] 誤メンション防止
 * @property {Array}   [files] 添付ファイル
 * @property {Array}   [attachments] 既存添付を維持/差し替えしたい場合
 * @property {number}  [suppressEmbeds] メッセージの埋め込み抑止フラグ(Discord flags)
 */

function buildPayload(embeds = [], components = [], content = null, opts = {}) {
  const payload = {
    allowedMentions: { parse: [] },
    ...opts,
  };
  if (embeds?.length) payload.embeds = embeds;
  if (components?.length) payload.components = components;
  if (content !== null && content !== undefined) payload.content = content;
  return payload;
}

/**
 * 可能な経路で更新を試みる
 * 優先度: interaction.update → editReply → message.edit → reply
 * 戻り値: { ok: boolean, via: 'update'|'editReply'|'message.edit'|'reply'|null, error?: any }
 * @param {import('discord.js').Interaction} interaction
 * @param {Array} embeds
 * @param {Array} components
 * @param {string|null} content
 * @param {UpdateOptions} options
 */
async function updatePanel(interaction, embeds = [], components = [], content = null, options = {}) {
  const opts = {
    ephemeralOnFail: true,
    allowedMentions: { parse: [] },
    ...options,
  };
  const payload = buildPayload(embeds, components, content, opts);

  try {
    // 1) コンポーネント系（Button / SelectMenu / Modal submit）: interaction.update
    if (typeof interaction.isMessageComponent === 'function' && interaction.isMessageComponent()) {
      await interaction.update(payload);
      logger.debug(`[panelUpdater] interaction.update() 成功: ${interaction.customId}`);
      return { ok: true, via: 'update' };
    }
    if (typeof interaction.isModalSubmit === 'function' && interaction.isModalSubmit()) {
      // Modal submit は update が無い → editReplyルートへ
    }

    // 2) すでに defer/reply 済み: editReply
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(payload);
      logger.debug(`[panelUpdater] interaction.editReply() 成功`);
      return { ok: true, via: 'editReply' };
    }

    // 3) 対象メッセージが分かる場合: message.edit
    if (interaction.message?.editable) {
      await interaction.message.edit(payload);
      logger.debug(`[panelUpdater] message.edit() 成功`);
      return { ok: true, via: 'message.edit' };
    }

    // 4) まだ何も返していないなら reply
    if (typeof interaction.reply === 'function' && !interaction.replied) {
      await interaction.reply({ ...payload, ephemeral: !!opts.ephemeralOnFail });
      logger.debug('[panelUpdater] interaction.reply() 成功(フォールバック)');
      return { ok: true, via: 'reply' };
    }

    logger.warn('[panelUpdater] 更新可能な経路が見つかりません');
    return { ok: false, via: null };
  } catch (err) {
    logger.error(`❌ [panelUpdater] 更新失敗: ${err?.message || err}`);
    // 最後の保険: 失敗をユーザーに伝える（ephemeral）
    try {
      if (!interaction.replied && opts.ephemeralOnFail && typeof interaction.reply === 'function') {
        await interaction.reply({ content: '⚠️ パネル更新に失敗しました。', ephemeral: true });
      } else if (interaction.deferred && typeof interaction.editReply === 'function') {
        await interaction.editReply({ content: '⚠️ パネル更新に失敗しました。' });
      }
    } catch {}
    return { ok: false, via: null, error: err };
  }
}

module.exports = { updatePanel, buildPayload };
