// src/handlers/uriage/uriagePanel_config.js

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { getUriageConfig, getUriagePanelList, saveUriageConfig } = require('../../utils/uriage/gcsUriageManager');
const { IDS } = require('./ids');
const { readJson } = require('../../utils/gcs'); // 店舗情報参照に使用

/**
 * すべての店舗用「売上報告パネル」を更新する（panelList の messageId を優先的に編集する）
 * @param {import('discord.js').Interaction} interaction
 */
async function updateUriageStorePanels(interaction) {
  try {
    const guildId = interaction.guild.id;
    const panelList = await getUriagePanelList(guildId);

    for (const p of panelList) {
      try {
        const { store, channel: channelId, messageId } = p;
        const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
        if (!channel || !channel.isTextBased?.()) continue;

        const panelEmbed = new EmbedBuilder()
          .setTitle(`💰 売上報告パネル (${store})`)
          .setDescription('下のボタンを押して、本日の売上を報告してください。')
          .setColor(0x5865f2);

        const reportButton = new ButtonBuilder()
          // モーダルと送信ハンドラがどの店舗を対象とするかを判断できるように、
          // ボタンの customId に店舗IDを含める
          .setCustomId(`${IDS.BTN_REPORT_OPEN}:${store}`)
          .setLabel('売上を報告する')
          .setStyle(ButtonStyle.Primary);

        const components = [new ActionRowBuilder().addComponents(reportButton)];

        if (messageId) {
          const msg = await channel.messages.fetch(messageId).catch(() => null);
          if (msg) {
            await msg.edit({ embeds: [panelEmbed], components }).catch(() => null);
            console.log(`🔄 売上報告パネルを更新しました（${store}）`);
            continue;
          }
        }

        // messageId がない、もしくは取得に失敗した場合は最近のメッセージから探す
        const msgs = await channel.messages.fetch({ limit: 50 }).catch(() => null);
        const found = msgs && msgs.find(m => m.embeds?.[0]?.title?.includes('売上報告パネル') && m.embeds[0].title.includes(store));
        if (found) {
          await found.edit({ embeds: [panelEmbed], components }).catch(() => null);
          console.log(`🔄 売上報告パネルを更新しました（${store}）`);
        } else {
          // 見つからなければ再送信して messageId を更新する
          const sent = await channel.send({ embeds: [panelEmbed], components }).catch(() => null);
          if (sent) console.log(`🆕 売上報告パネルを再生成しました（${store}）`);
        }
      } catch (e) {
        console.error(`❌ 売上報告パネルの更新に失敗しました（${p.store}）:`, e);
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
async function buildUriagePanelConfig(guildId) {
  const config = await getUriageConfig(guildId);
  const panelList = await getUriagePanelList(guildId);

  // パネルEmbed
  const embed = new EmbedBuilder()
    .setTitle('💰 売上設定パネル')
    .setDescription('売上設定および報告パネル管理を行います。')
    .setColor(0x00bfa5);

  embed.addFields([
    {
      name: '📋 売上報告パネル一覧',
      value: await buildPanelListDisplay(guildId),
    },
    {
      name: '🛡️ 承認役職',
      value: config.approverRoles?.map((r) => `<@&${r}>`).join(', ') || '未設定',
      inline: true,
    },
    {
      name: '👁️ 閲覧役職',
      value: config.viewerRoles?.map((r) => `<@&${r}>`).join(', ') || '未設定',
      inline: true,
    },
    {
      name: '📝 申請役職',
      value: config.applicantRoles?.map((r) => `<@&${r}>`).join(', ') || '未設定',
      inline: true,
    },
    {
      name: '🕒 更新日時',
      value: config.updatedAt || '---',
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
async function buildPanelListDisplay(guildId) {
  try {
    // 店舗一覧
    const storeData = await readJson(`GCS/${guildId}/config/店舗_役職_ロール.json`);
    const stores = storeData?.stores || [];

    // 設置済みパネル一覧
    const panelList = await getUriagePanelList(guildId);

    if (!stores.length) return '（店舗情報が登録されていません）';
    const lines = stores.map((store) => {
      // storeId または store 名のどちらか一致で判定
      const panel = panelList.find(
        (p) => p.storeId === store.id || p.store === store.name
      );

      // 表示チャンネルをリンク形式にする
      const channelText = panel?.channel
        ? `<#${panel.channel}>`
        : '（未設置）';

      return `・${store.name}：${channelText}`;
    });

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
async function updateUriagePanel(interaction) {
  try {
    const guildId = interaction.guild.id;
    const channel = interaction.channel;
    const { embeds, components } = await buildUriagePanelConfig(guildId);
    // まず操作チャンネル内を検索して更新
    try {
      const messages = await channel.messages.fetch({ limit: 20 }).catch(() => null);
      const existingPanel = messages && messages.find((m) => m.embeds?.[0]?.title === '💰 売上設定パネル');
      if (existingPanel) {
        await existingPanel.edit({ embeds, components }).catch(() => null);
        console.log('🔄 売上設定パネルを更新しました。');

        // 保存: 設定パネルの messageId を config に保持する
        try {
          const cfg = await getUriageConfig(guildId);
          cfg.settingsPanel = cfg.settingsPanel || {};
          cfg.settingsPanel.channel = channel.id;
          cfg.settingsPanel.messageId = existingPanel.id;
          await saveUriageConfig(guildId, cfg);
        } catch (e) {
          console.warn('⚠️ 設定パネル messageId の保存に失敗しました:', e.message);
        }

        return;
      }
    } catch (e) {
      // 無視してギルド全体の検索を続ける
    }

    // 操作チャンネルに見つからなければ、ギルド内のテキストチャンネルを探索して既存パネルを探す
    const textChannels = interaction.guild.channels.cache.filter(c => c.isTextBased && c.type);
    for (const [, ch] of textChannels) {
      try {
        if (!ch || !ch.isTextBased?.()) continue;
        const msgs = await ch.messages.fetch({ limit: 20 }).catch(() => null);
        const found = msgs && msgs.find((m) => m.embeds?.[0]?.title === '💰 売上設定パネル');
        if (found) {
          await found.edit({ embeds, components }).catch(() => null);
          console.log(`🔄 売上設定パネルを更新しました（チャンネル: ${ch.id}）。`);
          // 保存
          try {
            const cfg = await getUriageConfig(guildId);
            cfg.settingsPanel = cfg.settingsPanel || {};
            cfg.settingsPanel.channel = ch.id;
            cfg.settingsPanel.messageId = found.id;
            await saveUriageConfig(guildId, cfg);
          } catch (e) {
            console.warn('⚠️ 設定パネル messageId の保存に失敗しました:', e.message);
          }
          return;
        }
      } catch (e) {
        // 個別チャンネルで失敗しても処理を続行
        continue;
      }
    }

    // どこにも見つからなければ操作チャンネルに新規設置
    try {
      const sent = await channel.send({ embeds, components }).catch(() => null);
      if (sent) {
        console.log('🆕 売上設定パネルを再生成しました。');
        try {
          const cfg = await getUriageConfig(guildId);
          cfg.settingsPanel = cfg.settingsPanel || {};
          cfg.settingsPanel.channel = channel.id;
          cfg.settingsPanel.messageId = sent.id;
          await saveUriageConfig(guildId, cfg);
        } catch (e) {
          console.warn('⚠️ 設定パネル messageId の保存に失敗しました:', e.message);
        }
      }
    } catch (e) {
      // 無視
    }
  } catch (err) {
    console.error('❌ 売上設定パネル更新エラー:', err);
  }
}

module.exports = { buildUriagePanelConfig, updateUriagePanel, updateUriageStorePanels };
