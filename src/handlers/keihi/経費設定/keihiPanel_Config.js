// src/handlers/keihi/経費設定/keihiPanel_config.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getKeihiConfig, getKeihiPanelList } = require('../../../utils/keihi/gcsKeihiManager');
const { loadStoreRoleConfig } = require('../../../utils/config/storeRoleConfigManager');
const { IDS } = require('./ids');

/**
 * すべての店舗用「経費申請パネル」を更新する
 * @param {import('discord.js').Interaction} interaction
 */
async function updateKeihiStorePanels(interaction) {
  try {
    const guildId = interaction.guild.id;
    const config = await getKeihiConfig(guildId);
    const stores = config.stores || {};
    const storeItems = config.storeItems || {};

    for (const [storeName, channelId] of Object.entries(stores)) {
      try {
        const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
        if (!channel || !channel.isTextBased?.()) continue;

        const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
        const existing = messages && messages.find(m => m.embeds?.[0]?.title?.includes('経費申請パネル') && m.embeds[0].title.includes(storeName));

        const items = (storeItems[storeName] || []).map(i => `・${i}`).join('\n') || 'まだ設定されていません。';

        const embed = new EmbedBuilder()
          .setColor(0x2b6cb0)
          .setTitle(`📋 経費申請パネル（${storeName}）`)
          .setDescription('経費申請する場合は、下のボタンを押してください。')
          .addFields([{ name: '経費項目', value: items }]);

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`${IDS.BTN_ITEM_REGISTER}:${storeName}`)
            .setLabel('経費項目登録')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`${IDS.BTN_REPORT_OPEN}:${storeName}`)
            .setLabel('経費申請')
            .setStyle(ButtonStyle.Primary),
        );

        if (existing) {
          await existing.edit({ embeds: [embed], components: [row] }).catch(() => null);
          console.log(`🔄 経費申請パネルを更新しました: ${storeName} (<#${channelId}>)`);
        } else {
          await channel.send({ embeds: [embed], components: [row] }).catch(() => null);
          console.log(`🆕 経費申請パネルを再生成しました: ${storeName} (<#${channelId}>)`);
        }
      } catch (e) {
        console.error(`❌ 店舗パネル更新失敗 (${storeName}):`, e);
        continue;
      }
    }
  } catch (err) {
    console.error('❌ updateKeihiStorePanels エラー:', err);
  }
}

/**
 * 経費設定パネルを構築
 * @param {string} guildId
 * @returns {Promise<{embeds: EmbedBuilder[], components: ActionRowBuilder[]}>}
 */
async function buildKeihiPanelConfig(guildId) {
  const config = await getKeihiConfig(guildId);
  const panelList = await getKeihiPanelList(guildId);
  const storeCfg = await loadStoreRoleConfig(guildId);
  const stores = storeCfg?.stores || [];
  // build map: id -> name (stores may be objects {id,name} or plain strings)
  const storeMap = {};
  for (const s of stores) {
    if (!s) continue;
    if (typeof s === 'string') {
      storeMap[s] = s;
    } else if (s.id) {
      storeMap[s.id] = s.name || s.id;
    }
  }

  // 経費設定パネル Embed
  const embed = new EmbedBuilder()
    .setTitle('💼 経費設定パネル')
    .setColor(0x0078ff)
    .addFields([
      {
        name: '📋 経費パネル設置一覧',
        value: stores.length > 0
          ? stores.map(s => {
              const storeId = s.id || s;
              const storeName = storeMap[storeId] || storeId;
              const panel = panelList.find(p => p.store === storeId);
              if (panel) {
                return `・${storeName}: <#${panel.channel}>`;
              }
              return `・${storeName}: 未設定`;
            }).join('\n')
          : '（店舗未登録）',
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

  // ボタン行
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(IDS.BTN_KEIHI_PANEL_SETUP)
      .setLabel('経費パネル設置')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(IDS.BTN_KEIHI_ROLE_APPROVER)
      .setLabel('承認役職')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(IDS.BTN_KEIHI_ROLE_VIEWER)
      .setLabel('閲覧役職')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(IDS.BTN_KEIHI_ROLE_APPLICANT)
      .setLabel('申請役職')
      .setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(IDS.BTN_KEIHI_CSV_EXPORT)
      .setLabel('経費CSV発行')
      .setStyle(ButtonStyle.Success)
  );

  return { embeds: [embed], components: [row1, row2] };
}

/**
 * 経費設定パネルを更新（既存パネル削除 → 再送信）
 * @param {import('discord.js').Interaction} interaction
 */
async function updateKeihiPanel(interaction) {
  try {
    const guildId = interaction.guild.id;
    const channel = interaction.channel;
    const { embeds, components } = await buildKeihiPanelConfig(guildId);

    const messages = await channel.messages.fetch({ limit: 30 });
    const oldPanel = messages.find((m) => m.embeds?.[0]?.title === '💼 経費設定パネル');
    if (oldPanel) await oldPanel.delete().catch(() => null);

    await channel.send({ embeds, components });
    console.log('🔄 経費設定パネルを再生成しました。');
  } catch (err) {
    console.error('❌ 経費設定パネル更新エラー:', err);
  }
}

module.exports = { buildKeihiPanelConfig, updateKeihiPanel, updateKeihiStorePanels };
