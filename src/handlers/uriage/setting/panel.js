// src/handlers/uriage/uriagePanel_config.js

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const logger = require('../../../utils/logger');
const { loadUriageConfig, saveUriageConfig } = require('../../../utils/uriage/uriageConfigManager');
const { loadUriageStoreConfig } = require('../../../utils/uriage/gcsUriageManager'); // resolveStoreName 用
const { loadStoreConfig } = require('../../../utils/config/storeConfigManager'); // resolveStoreName 用
const { IDS } = require('./ids');
/**
 * すべての店舗用「売上報告パネル」を更新する（panelList の messageId を優先的に編集する）
 * @param {import('discord.js').Interaction} interaction
 */
async function updateUriageStorePanels(interaction) {
  try {
    const guildId = interaction.guild.id;
    const globalConfig = await loadUriageConfig(guildId);
    const panelKeys = Object.keys(globalConfig.panels || {});
    const { upsertStoreReportPanelMessage } = require('../report/panel'); // 循環参照回避のため遅延ロード

    for (const storeId of panelKeys) {
      try {
        const { channelId, messageId } = globalConfig.panels[storeId];
        const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
        if (!channel || !channel.isTextBased?.()) continue;

        // upsertStoreReportPanelMessage を呼び出して、個別の報告パネルを更新
        const updatedPanelMessage = await upsertStoreReportPanelMessage(interaction.guild, storeId, globalConfig);
        if (updatedPanelMessage) {
          // messageId が変わった場合は config を更新
          if (globalConfig.panels[storeId].messageId !== updatedPanelMessage.id) {
            globalConfig.panels[storeId].messageId = updatedPanelMessage.id;
            await saveUriageConfig(guildId, globalConfig);
          }
          logger.info(`🔄 売上報告パネルを更新しました（${storeId}）`);
        } else {
          logger.warn(`⚠️ 売上報告パネルの更新に失敗しました（${storeId}）。パネルが削除された可能性があります。`);
          // パネルが削除されたとみなし、config から削除
          delete globalConfig.panels[storeId];
          await saveUriageConfig(guildId, globalConfig);
        }
      } catch (e) {
        logger.error(`❌ 売上報告パネルの更新に失敗しました（${storeId}）:`, e);
        continue;
      }
    }
  } catch (err) {
    console.error('❌ updateUriageStorePanels エラー:', err);
  }
}

/**
 * 売上設定パネルを構築
 * @param {string} guildId - ギルドID
 * @returns {Promise<{embeds: EmbedBuilder[], components: ActionRowBuilder[]}>}
 */
async function buildUriageSettingPanelPayload(guildId) {
  const config = await loadUriageConfig(guildId);
  const guild = global.client.guilds.cache.get(guildId); // ギルドオブジェクト取得

  let storeConfig = null;
  try {
    storeConfig = await loadStoreConfig(guildId);
  } catch (err) {
    logger.warn('[uriage/setting/panel] storeConfig 読み込み失敗', err);
  }

  // keihi/setting/panel.js の resolveStoreName を参考に実装
  function resolveStoreName(storeConfig, storeId) {
    if (!storeConfig) return storeId;
    const rawStores = storeConfig.stores ?? storeConfig ?? {};
    if (Array.isArray(rawStores)) {
      const store = rawStores.find(s => s.id === storeId || s.name === storeId);
      return store?.name ?? storeId;
    } else if (rawStores && typeof rawStores === 'object') {
      return rawStores[storeId]?.name ?? storeId;
    }
    return storeId;
  }

  // パネルEmbed
  const embed = new EmbedBuilder()
    .setTitle('💰 売上設定パネル')
    .setDescription('売上設定および報告パネル管理を行います。')
    .setColor(0x00bfa5);

  embed.addFields([
    {
      name: '📋 売上報告パネル一覧',
      value: await buildPanelListDisplay(guildId, storeConfig, resolveStoreName),
    },
    {
      name: '🛡️ 承認役職',
      value: config.approverRoleIds?.map((r) => `<@&${r}>`).join(', ') || '未設定',
      inline: true,
    },
    {
      name: '👁️ 閲覧役職',
      value: config.viewerRoleIds?.map((r) => `<@&${r}>`).join(', ') || '未設定',
      inline: true,
    },
    {
      name: '📝 申請役職',
      value: config.applicantRoleIds?.map((r) => `<@&${r}>`).join(', ') || '未設定',
      inline: true,
    },
    {
      name: '🕒 更新日時',
      value: config.lastUpdated ? `<t:${Math.floor(new Date(config.lastUpdated).getTime() / 1000)}:F>` : '---',
      inline: false,
    },
  ]);

  // ボタン
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(IDS.BTN_PANEL_SETUP)
      .setLabel('売上報告パネル設置')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(IDS.BTN_ROLE_APPROVER)
      .setLabel('承認役職')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(IDS.BTN_ROLE_VIEWER)
      .setLabel('閲覧役職')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(IDS.BTN_ROLE_APPLICANT)
      .setLabel('申請役職')
      .setStyle(ButtonStyle.Secondary),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(IDS.BTN_CSV_EXPORT)
      .setLabel('売上CSV発行')
      .setStyle(ButtonStyle.Success)
  );

  return { embeds: [embed], components: [row1, row2] };
}

/**
 * 📋 設置済み売上報告パネル一覧を生成
 * 店舗名＋チャンネルリンク形式で全店舗を表示
 */
async function buildPanelListDisplay(guildId, storeConfig, resolveStoreName) {
  try {
    const globalConfig = await loadUriageConfig(guildId);
    const panelKeys = Object.keys(globalConfig.panels || {});

    // 報告パネルが一つも設置されていない場合
    if (!panelKeys.length) return '（報告パネルは設置されていません）';

    const lines = await Promise.all(panelKeys.map(async (storeId) => {
      const panel = globalConfig.panels[storeId];
      const storeConfig = await loadUriageStoreConfig(guildId, storeId);
      const storeName = storeConfig.name || storeId;

      // 表示チャンネルをリンク形式にする (resolveStoreName を使用)
      const channelText = panel?.channelId
        ? `<#${panel.channelId}>`
        : '（未設置）';

      return `・${storeName}：${channelText}`;
    }));

    return lines.join('\n');
  } catch (err) {
    console.error('⚠️ 店舗一覧の取得に失敗:', err);
    return '（読み込みエラー）';
  }
}

/**
 * 売上設定パネルを更新（既存メッセージを探して上書き）
 * @param {import('discord.js').Interaction} interaction
 */
async function refreshUriageSettingPanelMessage(guild, globalConfig) {
  try {
    const guildId = guild.id;
    const { embeds, components } = await buildUriageSettingPanelPayload(guildId);
    const panelInfo = globalConfig.configPanel;

    // まず操作チャンネル内を検索して更新
    try {
      const channel = await guild.channels.fetch(panelInfo.channelId);
      const existingPanel = await channel.messages.fetch(panelInfo.messageId);
      if (existingPanel) {
        await existingPanel.edit({ embeds, components }).catch(() => null);
        console.log('🔄 売上設定パネルを更新しました。');

        // 保存: 設定パネルの messageId を config に保持する
        try {
          const cfg = await loadUriageConfig(guildId);
          cfg.configPanel.channelId = channel.id; // 念のため
          cfg.configPanel.messageId = existingPanel.id; // 念のため
          cfg.lastUpdated = new Date().toISOString();
          await saveUriageConfig(guildId, cfg);
        } catch (e) {
          console.warn('⚠️ 設定パネル messageId の保存に失敗しました:', e.message);
        }

        return;
      }
    } catch (e) {
    logger.warn('[uriage/setting/panel] 既存設定パネル更新失敗。', e);
    // 既存メッセージが見つからない場合は config をクリア
    globalConfig.configPanel = { channelId: null, messageId: null };
    await saveUriageConfig(guildId, globalConfig);
    }
  } catch (err) {
    logger.error('❌ refreshUriageSettingPanelMessage エラー:', err);
  }
}

/**
 * /設定売上 コマンド実行時: 設定パネル送信/更新
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 */
async function postUriageSettingPanel(interaction) {
  const guild = interaction.guild;
  const guildId = guild.id;

  const globalConfig = await loadUriageConfig(guildId);
  const payload = await buildUriageSettingPanelPayload(guildId);

  const panelInfo = globalConfig.configPanel;

  // 既存パネルがあればそのメッセージを更新
  if (panelInfo?.channelId && panelInfo?.messageId) {
    try {
      const channel = await guild.channels.fetch(panelInfo.channelId);
      if (!channel || !channel.isTextBased()) {
        throw new Error('channel not found or not text based');
      }

      const message = await channel.messages.fetch(panelInfo.messageId);
      await message.edit(payload);

      // configPanel に統一して保存
      globalConfig.configPanel = {
        channelId: panelInfo.channelId,
        messageId: panelInfo.messageId,
      };
      await saveUriageConfig(guildId, globalConfig);

      await interaction.editReply({
        content: '売上設定パネルを更新しました。',
      });
      return;
    } catch (err) {
      logger.warn(
        '[uriage/setting/panel] 既存パネル更新失敗 → 新規送信へフォールバック',
        err,
      );
    } // catchブロックの閉じ括弧

  // 既存がない or 取得失敗 → 新しく現在のチャンネルに送信
  const sent = await interaction.channel.send(payload);

  globalConfig.configPanel = {
    channelId: sent.channelId,
    messageId: sent.id,
  };
  await saveUriageConfig(guildId, globalConfig);

  await interaction.editReply({ content: '✅ 売上設定パネルを送信しました。' });
}

module.exports = {
  buildUriageSettingPanelPayload,
  refreshUriageSettingPanelMessage,
  updateUriageStorePanels, // これは report/panel.js の upsertStoreReportPanelMessage を呼び出すユーティリティとして残す
  postUriageSettingPanel,
};
