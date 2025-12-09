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
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
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
const { resolveStoreName } = require('./panel');
const { IDS } = require('./ids');

/**
 * 「経費パネル設置」ボタン → 店舗選択
 */
async function handleSetPanelButton(interaction) {
  try {
    const guildId = interaction.guild.id;
    let storeRoleConfig = null;

    try {
      storeRoleConfig = await loadStoreRoleConfig(guildId);
    } catch (err) {
      logger.error('[keihi/setting/panelLocation] 店舗ロール設定の読み込みに失敗しました', err);
    }

    const rawStores = storeRoleConfig?.stores ?? storeRoleConfig ?? {};
    let stores = [];

    if (Array.isArray(rawStores)) {
      stores = rawStores.map((store, index) => {
        if (typeof store === 'string') {
          return { id: String(index), name: store };
        }
        const id = store.id ?? store.storeId ?? index;
        const name = store.name ?? store.storeName ?? `店舗${id}`;
        return { id: String(id), name: String(name) };
      });
    } else if (rawStores && typeof rawStores === 'object') {
      stores = Object.keys(rawStores).map(storeId => {
        const name = resolveStoreName(storeRoleConfig, storeId);
        return { id: String(storeId), name: String(name) };
      });
    }

    if (!stores.length) {
      await interaction.reply({
        content: '店舗が登録されていません。先に`/設定`などで店舗を作成してください。',
      });
      return;
    }

    const options = stores.map(store => ({
      label: store.name,
      value: store.name, // 店舗名をそのまま value に
    }));

    const select = new StringSelectMenuBuilder()
      .setCustomId(IDS.SEL_STORE_FOR_PANEL)
      .setPlaceholder('経費パネルを設置する店舗を選択')
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(select);

    await interaction.reply({
      content: '経費パネルを設置する店舗を選択してください。',
      components: [row],
    });
  } catch (err) {
    logger.error('[keihi/setting/panelLocation] handleSetPanelButton エラー', err);
    try {
      await interaction.reply({
        content: `エラーが発生しました: ${err.message || 'Unknown error'}`,
      });
    } catch (replyErr) {
      logger.error('[keihi/setting/panelLocation] エラーメッセージ送信失敗', replyErr);
    }
  }
}

/**
 * 店舗選択 → パネル設置チャンネル選択
 */
async function handleStoreForPanelSelect(interaction) {
  try {
    const storeName = interaction.values[0];

    const chSelect = new ChannelSelectMenuBuilder()
      .setCustomId(`${IDS.PANEL_CHANNEL_PREFIX}${storeName}`) // keihi_config:sel:panel_channel:{storeName}
      .setPlaceholder('経費申請パネルを設置するテキストチャンネルを選択')
      .setChannelTypes(ChannelType.GuildText);

    const row = new ActionRowBuilder().addComponents(chSelect);

    await interaction.update({
      content: `店舗「${storeName}」の経費申請パネルを設置するチャンネルを選択してください。`,
      components: [row],
    });
  } catch (err) {
    logger.error('[keihi/setting/panelLocation] handleStoreForPanelSelect エラー', err);
    try {
      if (!interaction.replied) {
        await interaction.reply({
          content: `エラーが発生しました: ${err.message || 'Unknown error'}`,
        });
      } else {
        await interaction.editReply({
          content: `エラーが発生しました: ${err.message || 'Unknown error'}`,
          components: [],
        });
      }
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
    const guildId = guild.id;

    const id = interaction.customId; // keihi_config:sel:panel_channel:{storeName}
    const parts = id.split(':');
    const storeId = parts[parts.length - 1];

    logger.info(
      `[keihi/setting/panelLocation] handlePanelChannelSelect: storeId="${storeId}", guildId="${guildId}"`,
    );

    const channelId = interaction.values[0];
    const channel = guild.channels.cache.get(channelId);

    if (!channel || !channel.isTextBased()) {
      logger.warn(
        `[keihi/setting/panelLocation] チャンネルが無効: channelId="${channelId}"`,
      );
      await interaction.reply({
        content: '選択されたチャンネルにメッセージを送信できません。',
      });
      return;
    }

    // 長い処理になるので deferUpdate（最後は editReply）
    await interaction.deferUpdate();

    const keihiConfig = await loadKeihiConfig(guildId);
    if (!keihiConfig.panels) keihiConfig.panels = {};
    if (!keihiConfig.panels[storeId]) {
      keihiConfig.panels[storeId] = {
        channelId,
        messageId: null,
        requestRoleIds: [],
        items: [],
      };
    } else {
      keihiConfig.panels[storeId].channelId = channelId;
    }

    await saveKeihiConfig(guildId, keihiConfig);

    // 店舗ロール設定読み込み（パネル描画用）
    const storeRoleConfig = await loadStoreRoleConfig(guildId).catch(() => null);

    // 店舗ごとの経費申請パネルメッセージを upsert
    const panelMessage = await upsertStorePanelMessage(
      guild,
      storeId,
      keihiConfig,
      storeRoleConfig,
    );

    if (panelMessage?.id) {
      keihiConfig.panels[storeId].messageId = panelMessage.id;
      await saveKeihiConfig(guildId, keihiConfig);
    }

    // 店舗別 config にも保存
    const storeConfig = (await loadKeihiStoreConfig(guildId, storeId)) || {};
    storeConfig.storeId = storeId;
    storeConfig.panel = {
      channelId,
      messageId: panelMessage?.id || storeConfig.panel?.messageId || null,
    };
    await saveKeihiStoreConfig(guildId, storeId, storeConfig);

    // 経費設定パネルを再描画
    try {
      await refreshPanel(guild, keihiConfig);
    } catch (refreshErr) {
      logger.warn('[keihi/setting/panelLocation] refreshPanel 失敗（続行）', refreshErr);
    }

    const storeName = resolveStoreName(storeRoleConfig, storeId);

    try {
      await sendSettingLog(interaction, {
        title: '経費申請パネル設置',
        description: `店舗「${storeName}」の経費申請パネルを<#${channelId}> に設置しました。`,
      });
    } catch (logErr) {
      logger.warn('[keihi/setting/panelLocation] sendSettingLog 失敗（続行）', logErr);
    }

    await interaction.editReply({
      content: `店舗「${storeName}」の経費申請パネルを<#${channelId}> に設置しました。`,
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
        await interaction.reply({
          content: `エラーが発生しました: ${err.message || 'Unknown error'}`,
        });
      } else {
        await interaction.editReply({
          content: `エラーが発生しました: ${err.message || 'Unknown error'}`,
          components: [],
        });
      }
    } catch (replyErr) {
      logger.error(
        '[keihi/setting/panelLocation] エラーメッセージ送信失敗',
        replyErr,
      );
    }
  }
}

module.exports = {
  handleSetPanelButton,
  handleStoreForPanelSelect,
  handlePanelChannelSelect,
};
