// src/handlers/keihi/keihiItemHandler.js

const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
const { saveKeihiConfig, getKeihiConfig } = require('../../utils/keihi/gcsKeihiManager');
const { updateKeihiPanel, updateKeihiStorePanels } = require('./keihiPanel_config');
const { sendSettingLog } = require('../../utils/keihi/embedLogger');
const { getGuildConfig } = require('../../utils/config/gcsConfigManager');

/**
 * 経費項目登録モーダルを表示
 * @param {import('discord.js').ButtonInteraction} interaction
 */
async function openItemRegisterModal(interaction) {
  // ボタンID `keihi:item:register:${storeName}` または旧形式 `keihi_item_register_${storeName}` から店舗名を取得
  const rawId = interaction.customId || '';
  const parts = rawId.includes(':') ? rawId.split(':') : rawId.split('_');
  const storeName = parts[3];
  if (!storeName) {
    return interaction.reply({ content: '⚠️ 店舗名が特定できませんでした。', ephemeral: true });
  }

  const modal = new ModalBuilder()
    .setCustomId(`keihi:modal:item:${storeName}`)
    .setTitle(`📦 ${storeName} の経費項目登録`);

  const input = new TextInputBuilder()
    .setCustomId('keihi_items')
    .setLabel('経費項目を改行で入力（例: 交通費\\n雑費）')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(input));
  await interaction.showModal(modal);
}

/**
 * 経費項目モーダル送信時の処理
 * @param {import('discord.js').ModalSubmitInteraction} interaction
 */
async function handleItemRegisterSubmit(interaction) {
  const guildId = interaction.guild.id;
  const rawId = interaction.customId || '';
  const parts = rawId.includes(':') ? rawId.split(':') : rawId.split('_');
  const storeName = parts[3];
  const itemsRaw = interaction.fields.getTextInputValue('keihi_items').trim();
  const items = itemsRaw.split('\n').map(s => s.trim()).filter(Boolean);

  const config = await getKeihiConfig(guildId);
  config.storeItems = config.storeItems || {};
  config.storeItems[storeName] = items;
  await saveKeihiConfig(guildId, config);

  // 設定パネル（操作したチャネル）と、既存の店舗用経費申請パネルを更新
  // 設定パネルは通常管理用チャネルに設置されているため、
  // 操作が行われたチャネルに設定パネルが存在しない場合は新規送信しない。
  try {
    const chMessages = await interaction.channel.messages.fetch({ limit: 50 }).catch(() => null);
    const hasSettingsPanelInChannel = chMessages && chMessages.some(m => m.embeds?.[0]?.title === '💼 経費設定パネル');
    if (hasSettingsPanelInChannel) {
      await updateKeihiPanel(interaction);
    } else {
      // 設定パネルがこのチャンネルにない場合は、強制再送信を避ける。
      console.log('ℹ️ 設定パネルは操作チャンネルに存在しないため再生成をスキップしました。');
    }
  } catch (e) {
    console.warn('[keihiItemHandler] 設定パネル更新判定中にエラー:', e?.message || e);
  }

  await updateKeihiStorePanels(interaction);

  // --- 設定ログ（経費モジュール用ログスレッド）へ出力 ---
  try {
    const itemsText = items.length ? items.map(i => `・${i}`).join('\n') : '（設定なし）';
    await sendSettingLog(guildId, {
      title: `✅ 経費項目が設定されました (${storeName})`,
      fields: [
        { name: '店舗', value: storeName, inline: true },
        { name: '経費項目', value: itemsText, inline: false },
      ],
    });
  } catch (e) {
    console.warn('[keihiItemHandler] 設定ログ送信エラー:', e.message);
  }

  // --- 管理者ログにも出力（global config の adminLogChannel を利用） ---
  try {
    const globalConfig = await getGuildConfig(guildId);
    const adminLogChannelId = globalConfig?.adminLogChannel;
    let panelLink = '未取得';
    try {
      const channelId = (config.stores || {})[storeName];
      if (channelId) {
        const ch = await interaction.guild.channels.fetch(channelId).catch(() => null);
        if (ch) {
          const msgs = await ch.messages.fetch({ limit: 50 }).catch(() => null);
          const panelMsg = msgs && msgs.find(m => m.embeds?.[0]?.title?.includes('経費申請パネル') && m.embeds[0].title.includes(storeName));
          if (panelMsg) panelLink = panelMsg.url;
        }
      }
    } catch (e) {
      console.warn('[keihiItemHandler] パネルメッセージリンク取得でエラー:', e.message);
    }

    if (adminLogChannelId) {
      const client = global.client || require('../../botClient').client;
      const logCh = client ? await client.channels.fetch(adminLogChannelId).catch(() => null) : null;
      if (logCh) {
        const { EmbedBuilder } = require('discord.js');
        const logEmbed = new EmbedBuilder()
          .setTitle(`📣 ${storeName} の経費項目が設定されました`)
          .addFields(
            { name: '店舗', value: storeName, inline: true },
            { name: '経費項目', value: items.length ? items.map(i => `・${i}`).join('\n') : '（設定なし）', inline: false },
            { name: '経費パネル', value: panelLink, inline: false },
            { name: '実行者', value: `<@${interaction.user.id}>`, inline: true },
            { name: '実行時間', value: new Date().toLocaleString('ja-JP'), inline: true },
          )
          .setTimestamp();
        await logCh.send({ embeds: [logEmbed] }).catch(() => null);
      }
    }
  } catch (e) {
    console.warn('[keihiItemHandler] 管理者ログ送信エラー:', e.message);
  }

  await interaction.reply({ content: `✅ **${storeName}** の経費項目を更新しました。`, flags: MessageFlags.Ephemeral });
}

module.exports = { openItemRegisterModal, handleItemRegisterSubmit };