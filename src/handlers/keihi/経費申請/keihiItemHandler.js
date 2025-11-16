// src/handlers/keihi/経費申請/keihiItemHandler.js

const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
} = require('discord.js');
const dayjs = require('dayjs');
const { loadKeihiConfig, saveKeihiConfig } = require('../../../utils/keihi/keihiConfigManager');
const { getGuildConfig } = require('../../../utils/config/gcsConfigManager');
const { formatLogEmbed } = require('../../../utils/keihi/embedLogger');
const { updateKeihiStorePanels } = require('../経費設定/keihiPanel_config');
const { IDS } = require('../経費設定/ids');

/**
 * 経費項目登録モーダルを表示
 * @param {import('discord.js').ButtonInteraction} interaction
 */
async function openItemRegisterModal(interaction) {
  // ボタンID `keihi:item:register:${storeName}` または旧形式 `keihi_item_register_${storeName}` から店舗名を取得する
  const storeName = interaction.customId.split(':')[1];

  const modal = new ModalBuilder()
    .setCustomId(`${IDS.MODAL_ITEM_REGISTER}_${storeName}`)
    .setTitle(`🧾 経費項目登録 (${storeName})`);

  const input = new TextInputBuilder()
    .setCustomId('keihi_items')
    .setLabel('経費項目（改行で複数入力可能）')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('例:\n交通費\n交際費\n雑費')
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(input));
  await interaction.showModal(modal);
}

/**
 * 経費項目モーダル送信時の処理
 * @param {import('discord.js').ModalSubmitInteraction} interaction
 */
async function handleItemRegisterSubmit(interaction) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const guildId = interaction.guild.id;
    const executor = interaction.user;
    const customId = interaction.customId.replace(/:/g, '_');
    const storeName = customId.split('_').pop();
    const itemsInput = interaction.fields.getTextInputValue('keihi_items');
    const newItems = itemsInput
      .split('\n')
      .map((v) => v.trim())
      .filter((v) => v.length > 0);

    if (!newItems.length) {
      return interaction.editReply({ content: '⚠️ 有効な項目が入力されていません。' });
    }

    // --- 設定読み込み・更新 ---
    const config = await loadKeihiConfig(guildId);
    config.storeItems = config.storeItems || {};
    const oldItems = config.storeItems[storeName] || [];
    config.storeItems[storeName] = newItems;
    config.updatedAt = dayjs().format('YYYY/MM/DD HH:mm');
    await saveKeihiConfig(guildId, config);

    // --- パネル再生成 ---
    await updateKeihiStorePanels(interaction);

    // --- ログ送信 ---
    const guildConfig = await getGuildConfig(guildId);
    const now = dayjs().format('YYYY/MM/DD HH:mm');
    const logEmbed = formatLogEmbed({
      title: `🧾 ${storeName} の経費項目を更新しました`,
      user: executor,
      fields: [
        { name: '店舗', value: storeName, inline: true },
        { name: '更新日時', value: now, inline: true },
        { name: '変更前', value: oldItems.length ? oldItems.join('\n') : '（なし）' },
        { name: '変更後', value: newItems.join('\n') },
      ],
    });

    // 設定ログスレッド
    if (guildConfig?.settingLogChannel) {
      const logCh = interaction.guild.channels.cache.get(guildConfig.settingLogChannel);
      if (logCh) await logCh.send({ embeds: [logEmbed] });
    }

    // コマンドログスレッド
    if (guildConfig?.commandLogChannel) {
      const cmdCh = interaction.guild.channels.cache.get(guildConfig.commandLogChannel);
      if (cmdCh) await cmdCh.send({ embeds: [logEmbed] });
    }

    // 店舗チャンネルにも通知
    const storeChannelId = config.stores?.[storeName];
    if (storeChannelId) {
      const storeChannel = interaction.guild.channels.cache.get(storeChannelId);
      if (storeChannel) {
        await storeChannel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0x2ecc71)
              .setDescription(
                `✅ 経費項目が更新されました。\n実行者：<@${executor.id}>\n更新日時：${now}`
              )
              .addFields({ name: '経費項目', value: newItems.join('\n') })
              .setFooter({ text: '設定操作ログ' })
              .setTimestamp(),
          ],
        });
      }
    }

    await interaction.editReply({
      content: `✅ ${storeName} の経費項目を更新しました。`,
    });
  } catch (err) {
    console.error('❌ handleItemRegisterSubmit エラー:', err);
    // deferReplyしているので、editReplyでエラーを返す
    await interaction.editReply({
      content: '⚠️ 経費項目の登録中にエラーが発生しました。',
    }).catch(() => {}); // editReplyが失敗しても無視
  }
}

module.exports = { openItemRegisterModal, handleItemRegisterSubmit };