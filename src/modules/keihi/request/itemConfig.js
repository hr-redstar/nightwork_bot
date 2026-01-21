// src/handlers/keihi/request/itemConfig.js
// ----------------------------------------------------
// 経費「経費項目登録」モーダル表示 & 保存
// ----------------------------------------------------

const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  MessageFlags,
} = require('discord.js');

const { getGuildConfig, saveGuildConfig } = require('../../../utils/config/gcsConfigManager');
const {
  loadKeihiConfig,
  saveKeihiConfig,
  loadKeihiStoreConfig,
  saveKeihiStoreConfig,
} = require('../../../utils/keihi/keihiConfigManager');

// ✅ submit 側で必要（パネル再描画で使う可能性が高い）
const { loadStoreRoleConfig } = require('../../../utils/config/storeRoleConfigManager');

const { resolveStoreName } = require('../setting/storeNameResolver');
const { sendSettingLog } = require('../../../utils/config/configLogger');
const { buildItemConfigModalId, parseItemConfigModalId } = require('./ids');
const { refreshKeihiRequestPanel } = require('./panel');
const logger = require('../../../utils/logger');

const MAX_TEXTINPUT_VALUE = 4000;
// Discord の上限（念のため固定）
const MAX_LABEL = 45;
const MAX_PLACEHOLDER = 100;

/**
 * パネルEmbedから現在の経費項目を（できるだけ）拾う
 * ※ showModal 前にGCS読み込みをすると遅延で「モーダル送信エラー」になりやすいので、
 *    まずは interaction.message の embed から取得して高速に出す。
 * @param {import('discord.js').ButtonInteraction} interaction
 * @returns {string} 改行区切りテキスト
 */
function tryGetCurrentItemsTextFromMessage(interaction) {
  try {
    const embeds = interaction.message?.embeds;
    if (!embeds || !embeds.length) return '';

    const embed = embeds[0];
    const fields = embed?.fields || [];
    const field = fields.find((f) => (f?.name || '').includes('経費項目'));
    const raw = field?.value || '';

    if (!raw || raw === '未設定（まず「経費項目登録」を行ってください）') return '';

    // "・交通費" のような形式を想定して整形
    const lines = raw
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => (l.startsWith('・') ? l.slice(1).trim() : l));

    return lines.join('\n').slice(0, MAX_TEXTINPUT_VALUE);
  } catch (_) {
    return '';
  }
}

/**
 * 「経費項目登録」ボタン押下時にモーダルを表示
 * @param {import('discord.js').ButtonInteraction} interaction
 * @param {string} storeKey  ※店舗名でもIDでもOK（内部キーとして扱う）
 */
async function openItemConfigModal(interaction, storeKey) {
  // showModal は最初の応答。先に defer/reply/update していると必ず失敗する
  if (interaction.deferred || interaction.replied) {
    logger.warn('[keihi/request/itemConfig] showModal skipped: already acknowledged', {
      customId: interaction.customId,
      deferred: interaction.deferred,
      replied: interaction.replied,
    });
    return;
  }

  // ✅ 速度優先：まずパネルメッセージから現在値を拾う（GCS読み込みはしない）
  const currentItemsText = tryGetCurrentItemsTextFromMessage(interaction);

  const modal = new ModalBuilder()
    .setCustomId(buildItemConfigModalId(storeKey))
    .setTitle('経費項目登録');

  const label = '経費項目（改行で複数登録）'.slice(0, MAX_LABEL);
  const placeholder = '例）交通費\n消耗品\n外注費'.slice(0, MAX_PLACEHOLDER);

  const input = new TextInputBuilder()
    .setCustomId('items')
    .setLabel(label)
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setPlaceholder(placeholder);

  // ✅ 空文字 value を送らない（Invalid Form Body 回避）
  if (currentItemsText && currentItemsText.trim().length > 0) {
    input.setValue(currentItemsText.slice(0, MAX_TEXTINPUT_VALUE));
  }

  modal.addComponents(new ActionRowBuilder().addComponents(input));

  try {
    await interaction.showModal(modal);
  } catch (err) {
    logger.error('[keihi/request/itemConfig] showModal failed', err);
    if (err?.rawError) {
      logger.error('[keihi/request/itemConfig] showModal rawError', err.rawError);
    }

    // ユーザーに通知（可能な場合だけ）
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: 'モーダルの表示に失敗しました。もう一度お試しください。',
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch (replyErr) {
      logger.error('[keihi/request/itemConfig] Failed to send error reply for showModal', replyErr);
    }
  }
}

/**
 * 経費項目モーダル送信後の処理
 * @param {import('discord.js').ModalSubmitInteraction} interaction
 */
async function handleItemConfigModalSubmit(interaction) {
  try {
    logger.info(
      '[keihi/request/itemConfig] handleItemConfigModalSubmit: 開始',
      { customId: interaction.customId },
    );

    const storeKey = parseItemConfigModalId(interaction.customId);
    if (!storeKey) return;

    const guild = interaction.guild;
    if (!guild) return;
    const guildId = guild.id;

    // 重い処理があるので先にACK
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const rawText = interaction.fields.getTextInputValue('items') || '';
    const items = rawText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const [keihiConfig, storeRoleConfig] = await Promise.all([
      loadKeihiConfig(guildId),
      loadStoreRoleConfig(guildId).catch(() => null),
    ]);

    // 表示用（ログ用）店舗名
    const storeName = resolveStoreName(storeRoleConfig, storeKey);

    // ✅ 店舗別configは「storeKey(ID)」で呼ぶ（保存先フォルダ名の解決は manager 側でやる）
    const oldStoreConfig = await loadKeihiStoreConfig(guildId, storeKey, storeRoleConfig).catch(() => ({}));

    if (!keihiConfig.panels) keihiConfig.panels = {};
    if (!keihiConfig.panels[storeKey]) {
      keihiConfig.panels[storeKey] = {
        channelId: null,
        messageId: null,
        viewRoleIds: [],
        requestRoleIds: [],
        items: [],
      };
    }

    const beforeItems = Array.isArray(keihiConfig.panels[storeKey].items)
      ? keihiConfig.panels[storeKey].items
      : [];

    // 全体設定へ保存
    keihiConfig.panels[storeKey].items = items;
    await saveKeihiConfig(guildId, keihiConfig);

    // 店舗別設定へ保存
    const storeConfig = oldStoreConfig || {};
    storeConfig.storeId = storeKey;
    storeConfig.storeName = storeName;  // 任意：入れておくとデバッグしやすい
    storeConfig.items = items;
    // ✅ 保存も storeKey(ID) で呼ぶ（保存先フォルダ名は manager 側で解決）
    await saveKeihiStoreConfig(guildId, storeKey, storeConfig, storeRoleConfig);

    // パネル更新
    await refreshKeihiRequestPanel(guild, storeKey, keihiConfig, storeRoleConfig);

    // 差分ログ
    const added = items.filter((i) => !beforeItems.includes(i));
    const removed = beforeItems.filter((i) => !items.includes(i));

    let desc = `店舗「${storeName}」の経費項目を更新しました。\n`;
    if (added.length) {
      desc += `\n**追加:**\n${added.map((i) => `・${i}`).join('\n')}`;
    }
    if (removed.length) {
      desc += `\n\n**削除:**\n${removed.map((i) => `・${i}`).join('\n')}`;
    }

    await sendSettingLog(interaction, {
      title: '経費項目設定',
      description: desc,
    });

    await interaction.editReply({
      content: '経費項目を更新しました。',
    });

    logger.info(
      '[keihi/request/itemConfig] handleItemConfigModalSubmit: 正常終了',
      { customId: interaction.customId },
    );
  } catch (err) {
    logger.error('[keihi/request/itemConfig] handleItemConfigModalSubmit failed', err);
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: 'エラーが発生しました。' }).catch(() => {});
    } else {
      await interaction
        .reply({ content: 'エラーが発生しました。', flags: MessageFlags.Ephemeral })
        .catch(() => {});
    }
  }
}

module.exports = {
  openItemConfigModal,
  handleItemConfigModalSubmit,
};
