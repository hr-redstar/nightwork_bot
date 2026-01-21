// src/handlers/keihi/setting/panelLocation.js
// ----------------------------------------------------
// 経費申請パネルの設置フロー
//   - 店舗選択
//   - チャンネル選択
//   - keihi/config.json への保存
//   - 店舗別パネルメッセージの設置/更新
// ----------------------------------------------------

const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
  MessageFlags,
} = require('discord.js');

const logger = require('../../../utils/logger');
const {
  loadKeihiConfig,
  saveKeihiConfig,
} = require('../../../utils/keihi/keihiConfigManager');
const {
  loadKeihiStoreConfig,
  saveKeihiStoreConfig,
} = require('../../../utils/keihi/keihiStoreConfigManager');
const {
  loadStoreRoleConfig,
} = require('../../../utils/config/storeRoleConfigManager');
const { sendSettingLog } = require('../../../utils/config/configLogger');
const { upsertStorePanelMessage } = require('../request/panel');

// 共通 店舗名リゾルバ（panel.js ラッパー経由）
const { resolveStoreName } = require('./panel');

const { IDS } = require('./ids');

/**
 * 「経費パネル設置」ボタン → 店舗選択
 * ※内部キーは「店舗名」で扱う（同名は同一店舗として扱う）
 */
async function handleSetPanelButton(interaction) {
  // 先にACK（3秒対策） + ephemeral警告対策（flags）
  await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});

  try {
    const guildId = interaction.guild?.id;
    if (!guildId) {
      return interaction.editReply({
        content: 'ギルド情報が取得できませんでした。',
        components: [],
      });
    }

    const storeRoleConfig = await loadStoreRoleConfig(guildId).catch(() => null);
    const rawStores = storeRoleConfig?.stores ?? storeRoleConfig ?? {};
    let stores = [];

    // 店舗一覧を { name } に寄せる（キーは店舗名）
    if (Array.isArray(rawStores)) {
      stores = rawStores.map((store, index) => {
        if (typeof store === 'string') return { name: store };
        const name = store?.name ?? store?.storeName ?? `店舗${index + 1}`;
        return { name: String(name) };
      });
    } else if (rawStores && typeof rawStores === 'object') {
      // 連想オブジェクトでも表示名は resolveStoreName で作る（value も同じ店舗名）
      stores = Object.keys(rawStores).map((storeId) => ({
        name: String(resolveStoreName(storeRoleConfig, storeId) || storeId),
      }));
    }

    if (!stores.length) {
      return interaction.editReply({
        content: '店舗が登録されていません。先に`/設定`などで店舗を作成してください。',
        components: [],
      });
    }

    // ★ value は店舗名（同名は同キーでOK）
    const options = stores.map((store) => ({
      label: store.name,
      value: store.name,
    }));

    // SelectMenu は 25 件制限
    const sliced = options.slice(0, 25);

    const select = new StringSelectMenuBuilder()
      .setCustomId(IDS.SEL_STORE_FOR_PANEL)
      .setPlaceholder('経費パネルを設置する店舗を選択')
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(sliced);

    const row = new ActionRowBuilder().addComponents(select);

    return interaction.editReply({
      content: '経費パネルを設置する店舗を選択してください。',
      components: [row],
    });
  } catch (err) {
    logger.error('[keihi/setting/panelLocation] handleSetPanelButton エラー', err);
    return interaction.editReply({
      content: `エラーが発生しました: ${err.message || 'Unknown error'}`,
      components: [],
    });
  }
}

/**
 * 店舗選択 → パネル設置チャンネル選択
 */
async function handleStoreForPanelSelect(interaction) {
  try {
    await interaction.deferUpdate().catch(() => {});

    // value は店舗名
    const storeName = interaction.values?.[0];
    const guildId = interaction.guild?.id;

    if (!storeName || !guildId) {
      return interaction.editReply({
        content: '店舗情報またはギルド情報が取得できませんでした。',
        components: [],
      });
    }

    // customId に店舗名を埋め込む（復元は split ではなく slice）
    const chSelect = new ChannelSelectMenuBuilder()
      .setCustomId(`${IDS.PANEL_CHANNEL_PREFIX}${storeName}`) // keihi_config:sel:panel_channel:{storeName}
      .setPlaceholder('経費申請パネルを設置するテキストチャンネルを選択')
      .setChannelTypes(ChannelType.GuildText);

    const row = new ActionRowBuilder().addComponents(chSelect);

    return interaction.editReply({
      content: `店舗「${storeName}」の経費申請パネルを設置するチャンネルを選択してください。`,
      components: [row],
    });
  } catch (err) {
    logger.error('[keihi/setting/panelLocation] handleStoreForPanelSelect エラー', err);
    try {
      if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({
          content: `エラーが発生しました: ${err.message || 'Unknown error'}`,
          flags: MessageFlags.Ephemeral,
        });
      }
      return interaction.editReply({
        content: `エラーが発生しました: ${err.message || 'Unknown error'}`,
        components: [],
      });
    } catch (replyErr) {
      logger.error('[keihi/setting/panelLocation] エラーメッセージ送信失敗', replyErr);
    }
  }
}

/**
 * チャンネル選択 → keihi/config.json に保存 & パネルを設置
 *
 * @param {import('discord.js').ChannelSelectMenuInteraction} interaction
 * @param {(guild: import('discord.js').Guild, keihiConfig: any) => Promise<void>} refreshPanel
 */
async function handlePanelChannelSelect(interaction, refreshPanel) {
  try {
    const guild = interaction.guild;
    const guildId = guild?.id;

    if (!guild || !guildId) {
      return interaction.reply({
        content: 'ギルド情報が取得できませんでした。',
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferUpdate().catch(() => {});

    // ★ split ではなく slice（店舗名に ":" が入っても壊れにくい）
    const storeName = interaction.customId.slice(IDS.PANEL_CHANNEL_PREFIX.length);

    logger.info(
      `[keihi/setting/panelLocation] handlePanelChannelSelect: storeName="${storeName}", guildId="${guildId}"`,
    );

    const channelId = interaction.values?.[0];
    const channel = channelId ? guild.channels.cache.get(channelId) : null;

    if (!channel || !channel.isTextBased()) {
      return interaction.editReply({
        content: '選択されたチャンネルにメッセージを送信できません。',
        components: [],
      });
    }

    // 設定更新
    const keihiConfig = await loadKeihiConfig(guildId);
    if (!keihiConfig.panels) keihiConfig.panels = {};

    // ★ panels のキーは店舗名
    if (!keihiConfig.panels[storeName]) {
      keihiConfig.panels[storeName] = {
        channelId,
        messageId: null,
        requestRoleIds: [],
        items: [],
      };
    } else {
      keihiConfig.panels[storeName].channelId = channelId;
    }

    await saveKeihiConfig(guildId, keihiConfig);

    // 店舗ロール設定（パネル描画・ログ用）
    const storeRoleConfig = await loadStoreRoleConfig(guildId).catch(() => null);

    // 店舗ごとの経費申請パネルメッセージを upsert（店舗名キー運用）
    const panelMessage = await upsertStorePanelMessage(
      guild,
      storeName,
      keihiConfig,
      storeRoleConfig,
    );

    if (panelMessage?.id) {
      keihiConfig.panels[storeName].messageId = panelMessage.id;
      await saveKeihiConfig(guildId, keihiConfig);
    }

    // 店舗別 config にも保存（フォルダも店舗名になる）
    const storeConfig = (await loadKeihiStoreConfig(guildId, storeName)) || {};
    storeConfig.storeName = storeName;
    storeConfig.panel = {
      channelId,
      messageId: panelMessage?.id || storeConfig.panel?.messageId || null,
    };
    await saveKeihiStoreConfig(guildId, storeName, storeConfig);

    // 経費設定パネルを再描画
    try {
      await refreshPanel(guild, keihiConfig);
    } catch (refreshErr) {
      logger.warn('[keihi/setting/panelLocation] refreshPanel 失敗（続行）', refreshErr);
    }

    // ログ用の表示名（同名運用なら storeName をそのまま使ってもOK）
    const displayStoreName = resolveStoreName(storeRoleConfig, storeName) || storeName;

    try {
      await sendSettingLog(interaction, {
        title: '経費申請パネル設置',
        description: `店舗「${displayStoreName}」の経費申請パネルを<#${channelId}> に設置しました。`,
      });
    } catch (logErr) {
      logger.warn('[keihi/setting/panelLocation] sendSettingLog 失敗（続行）', logErr);
    }

    return interaction.editReply({
      content: `店舗「${displayStoreName}」の経費申請パネルを<#${channelId}> に設置しました。`,
      components: [],
    });
  } catch (err) {
    logger.error('[keihi/setting/panelLocation] handlePanelChannelSelect エラー', err);
    logger.error('[keihi/setting/panelLocation] エラー詳細:', {
      message: err.message,
      code: err.code,
      status: err.status,
      stack: err.stack,
    });

    try {
      if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({
          content: `エラーが発生しました: ${err.message || 'Unknown error'}`,
          flags: MessageFlags.Ephemeral,
        });
      }
      return interaction.editReply({
        content: `エラーが発生しました: ${err.message || 'Unknown error'}`,
        components: [],
      });
    } catch (replyErr) {
      logger.error('[keihi/setting/panelLocation] エラーメッセージ送信失敗', replyErr);
    }
  }
}

module.exports = {
  handleSetPanelButton,
  handleStoreForPanelSelect,
  handlePanelChannelSelect,
};
