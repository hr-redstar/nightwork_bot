// src/handlers/keihi/keihiItemHandler.js
const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');
const { loadKeihiConfig, saveKeihiConfig } = require('../../utils/keihi/keihiConfigManager');
const dayjs = require('dayjs');

/**
 * 経費項目登録ボタン押下
 * @param {import('discord.js').Interaction} interaction
 */
async function handleKeihiItemRegister(interaction) {
  // ボタンID `keihi_item_register_${storeName}` から店舗名を取得
  const storeName = interaction.customId.replace('keihi_item_register_', '');
  // 直接モーダルを表示する
  await showItemModal(interaction, storeName);
}

/**
 * 店舗選択後 → モーダル表示
 * @param {import('discord.js').StringSelectMenuInteraction} interaction
 */
async function handleKeihiItemSelect(interaction) {
  await showItemModal(interaction, interaction.values[0]);
}

/**
 * 経費項目登録モーダルを表示する共通関数
 */
async function showItemModal(interaction, storeName) {
  const modal = new ModalBuilder()
    .setCustomId(`keihi_item_modal_${storeName}`)
    .setTitle(`📦 ${storeName} の経費項目登録`);

  const input = new TextInputBuilder()
    .setCustomId('keihi_items')
    .setLabel('経費項目を改行で入力（例: 交通費\\n雑費\\n光熱費）')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(input));
  await interaction.showModal(modal);
}

/**
 * 経費項目モーダル送信時
 * @param {import('discord.js').ModalSubmitInteraction} interaction
 */
async function handleKeihiItemModal(interaction) {
  const guildId = interaction.guild.id;
  const user = interaction.user;
  const guild = interaction.guild;
  const now = dayjs().format('YYYY/MM/DD HH:mm');
  const itemsRaw = interaction.fields.getTextInputValue('keihi_items').trim();
  const items = itemsRaw.split('\n').map(s => s.trim()).filter(Boolean);
  const storeName = interaction.customId.replace('keihi_item_modal_', '');

  const config = await loadKeihiConfig(guildId);

  // 経費項目を保存
  config.storeItems = config.storeItems || {};
  config.storeItems[storeName] = items;
  await saveKeihiConfig(guildId, config);

  let panelMsg = null;
  const channelId = config.stores[storeName];
  const channel = guild.channels.cache.get(channelId);

  if (!channel) {
    return interaction.reply({
      content: `⚠️ 店舗 ${storeName} のチャンネルが見つかりません。`,
      flags: MessageFlags.Ephemeral,
    });
  }

  // 🔍 経費パネルメッセージを探す
  if (channel) {
    const messages = await channel.messages.fetch({ limit: 10 });
    panelMsg = messages.find(m => m.embeds?.[0]?.title?.includes(`経費申請パネル`));

    if (panelMsg) {
      // ✅ 既存パネルを更新
      const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

      const embed = new EmbedBuilder()
        .setColor('#2b6cb0')
        .setTitle(`📋 経費申請パネル（${storeName}）`)
        .setDescription('経費申請を行う場合は下のボタンを押してください。')
        .addFields({
          name: '📦 経費項目一覧',
          value: items.map(i => `・${i}`).join('\n') || '未設定',
        })
        .setFooter({ text: `最終更新：${now}` });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`keihi_item_register_${storeName}`)
          .setLabel('経費項目登録')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`keihi_request_${storeName}`)
          .setLabel('経費申請')
          .setStyle(ButtonStyle.Primary),
      );

      await panelMsg.edit({ embeds: [embed], components: [row] });
    }
  }

  // ✅ 管理者ログ出力
  const logChannelId = config.logChannelId;
  if (logChannelId) {
    const logCh = guild.channels.cache.get(logChannelId);
    if (logCh) {
      const logEmbed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle(`🧾 ${storeName} の経費項目が更新されました`)
        .setURL(panelMsg ? panelMsg.url : interaction.channel.url)
        .addFields(
          { name: '📦 登録項目', value: items.join('\n').slice(0, 1000) },
          { name: '👤 実行者', value: `<@${user.id}>` },
          { name: '🕒 実行時間', value: now },
        );
      await logCh.send({ embeds: [logEmbed] });
    }
  }

  await interaction.reply({
    content: `✅ 経費項目を更新しました。\n対象店舗：${storeName}`,
    flags: MessageFlags.Ephemeral,
  });
}

module.exports = {
  handleKeihiItemRegister,
  handleKeihiItemSelect,
  handleKeihiItemModal,
};
