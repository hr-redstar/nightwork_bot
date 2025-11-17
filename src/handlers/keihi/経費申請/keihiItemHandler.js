// src/handlers/keihi/経費申請/keihiItemHandler.js

const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
} = require('discord.js');

const dayjs = require('dayjs');

const {
  loadKeihiConfig,
  saveKeihiConfig,
} = require('../../../utils/keihi/keihiConfigManager');

const {
  getGuildConfig,
} = require('../../../utils/config/gcsConfigManager');

const {
  updateKeihiPanel,
} = require('../経費設定/keihiPanel_Config');

/**
 * 経費項目登録モーダルを開く
 * customId: keihi:item:register:<encodedStore>
 */
async function openItemRegisterModal(interaction) {
  const parts = interaction.customId.split(':');
  const storeEncoded = parts[3];
  const storeName = decodeURIComponent(storeEncoded);

  // 既存項目
  const config = await loadKeihiConfig(interaction.guild.id);
  const existingItems = config.storeItems?.[storeName] || [];
  const existingItemsText = existingItems.join('\n');

  const modal = new ModalBuilder()
    .setCustomId(`keihi:item:register_modal:${storeEncoded}`)
    .setTitle(`🧾 経費項目登録 (${storeName})`);

  const input = new TextInputBuilder()
    .setCustomId('keihi_items')
    .setLabel('経費項目（改行で複数入力）')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('例:\n交通費\n交際費\n雑費')
    .setValue(existingItemsText)
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(input));

  await interaction.showModal(modal);
}

/**
 * 経費項目登録モーダル送信
 * customId: keihi:item:register_modal:<encodedStore>
 */
async function handleItemRegisterSubmit(interaction) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const guildId = interaction.guild.id;
    const executor = interaction.user;

    const parts = interaction.customId.split(':');
    const storeEncoded = parts[3];
    const storeName = decodeURIComponent(storeEncoded);

    const itemsInput = interaction.fields.getTextInputValue('keihi_items');

    const newItems = itemsInput
      .split('\n')
      .map(v => v.trim())
      .filter(v => v.length > 0);

    if (!newItems.length) {
      return interaction.editReply({ content: '⚠️ 有効な項目がありません。' });
    }

    // --- 設定更新 ---
    const config = await loadKeihiConfig(guildId);

    config.storeItems = config.storeItems || {};
    const oldItems = config.storeItems[storeName] || [];

    config.storeItems[storeName] = newItems;
    config.updatedAt = dayjs().format('YYYY/MM/DD HH:mm');

    await saveKeihiConfig(guildId, config);

    // --- パネル更新 ---
    await updateKeihiPanel(interaction);

    // --- ログ ---
    const guildConfig = await getGuildConfig(guildId);
    const now = dayjs().format('YYYY/MM/DD HH:mm');

    const embed = new EmbedBuilder()
      .setColor('#2ecc71')
      .setTitle(`🧾 経費項目を更新しました`)
      .addFields(
        { name: '店舗', value: storeName, inline: true },
        { name: '更新日時', value: now, inline: true },
        {
          name: '変更前',
          value: oldItems.length ? oldItems.join('\n') : '（なし）'
        },
        { name: '変更後', value: newItems.join('\n') }
      )
      .setFooter({ text: `実行者: ${executor.tag}` })
      .setTimestamp();

    if (guildConfig?.settingLogThread) {
      const thread = await interaction.guild.channels.fetch(guildConfig.settingLogThread).catch(() => null);
      if (thread?.isTextBased()) thread.send({ embeds: [embed] });
    }

    // 店舗別チャンネル通知
    const storeChannelId = config.stores?.[storeName];
    if (storeChannelId) {
      const storeCh = interaction.guild.channels.cache.get(storeChannelId);
      if (storeCh) {
        await storeCh.send({
          embeds: [
            new EmbedBuilder()
              .setColor('#3498db')
              .setDescription(
                `📢 **${storeName} の経費項目が更新されました**\n実行者: <@${executor.id}>\n更新: ${now}`
              )
              .addFields({ name: '経費項目', value: newItems.join('\n') })
              .setTimestamp()
          ],
        });
      }
    }

    await interaction.editReply({
      content: `✅ **${storeName}** の経費項目を更新しました。`,
    });
  } catch (err) {
    console.error('❌ handleItemRegisterSubmit エラー:', err);
    await interaction.editReply({
      content: '⚠️ 経費項目の登録中にエラーが発生しました。',
    }).catch(() => {});
  }
}

module.exports = {
  openItemRegisterModal,
  handleItemRegisterSubmit,
};
