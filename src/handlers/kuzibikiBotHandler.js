/**
 * src/handlers/kuzibikiBotHandler.js
 * くじ引き関連のインタラクションを処理
 */
const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, MessageFlags, StringSelectMenuBuilder } = require('discord.js');
const { readKujiConfig, saveKujiConfig, saveKujiResult } = require('../utils/kuzibiki/kuzibikiStorage');
const { postKuzibikiPanel } = require('./kuzibikiPanel');
const { postKuzibikiPanel } = require('./kuzibiki/kuzibikiPanel');
const { sendSettingLog } = require('./config/configLogger');
const logger = require('../utils/logger');
const dayjs = require('dayjs');

async function kuzibikiBotHandler(interaction) {
  const { customId, guild, user } = interaction;

  try {
    // ============================================================
    // ボタン押下
    // ============================================================
    if (interaction.isButton()) {
      // --- くじ引き設定ボタン ---
      if (customId === 'kuzibiki_config') { // This was kuji_settings before
        const { settings } = readKujiConfig(guild.id);
        const currentItems = settings ? settings.join('\n') : '';

        const modal = new ModalBuilder()
          .setCustomId('kuji_settings_modal')
          .setTitle('🎲 くじ引き設定');

        const itemsInput = new TextInputBuilder()
          .setCustomId('kuji_items_input')
          .setLabel('くじの景品（改行で複数入力）')
          .setStyle(TextInputStyle.Paragraph)
          .setValue(currentItems)
          .setPlaceholder('例:\n1等賞\n2等賞\n残念賞')
          .setRequired(false);

        modal.addComponents(new ActionRowBuilder().addComponents(itemsInput));
        await interaction.showModal(modal);
        return;
      }

      // --- くじ引き実行ボタン ---
      if (customId === 'kuzibiki_execute') { // This was kuji_run before
        const { settings } = readKujiConfig(guild.id);
        const items = settings || [];

        if (items.length === 0) {
          return interaction.reply({ content: '⚠️ くじ引きの景品が設定されていません。', flags: MessageFlags.Ephemeral });
        }

        const maxCount = Math.min(items.length, 24);
        const options = Array.from({ length: maxCount }, (_, i) => ({
          label: `${i + 1}回`,
          value: `${i + 1}`,
        }));

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('kuji_select_count')
          .setPlaceholder('くじを引く回数を選択してください')
          .addOptions(options);

        await interaction.reply({
          content: '何回くじを引きますか？',
          components: [new ActionRowBuilder().addComponents(selectMenu)],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    }

    // ============================================================
    // セレクトメニュー
    // ============================================================
    if (interaction.isStringSelectMenu()) {
      // --- くじ引き回数選択 ---
      if (customId === 'kuji_select_count') {
        await interaction.deferUpdate();
        const count = parseInt(interaction.values[0], 10);
        await executeLottery(interaction, count);
        await interaction.editReply({ content: '✅ くじ引きを実行し、結果をスレッドに投稿しました。', components: [] });
        return;
      }
    }

    // ============================================================
    // モーダル送信
    // ============================================================
    if (interaction.isModalSubmit()) {
      if (customId === 'kuji_settings_modal') {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const { settings: oldItems } = readKujiConfig(guild.id);

        const newItemsRaw = interaction.fields.getTextInputValue('kuji_items_input');
        const newItems = newItemsRaw.split('\n').map(s => s.trim()).filter(Boolean);

        saveKujiConfig(guild.id, newItems);

        // パネルを更新
        await postKuzibikiPanel(interaction.channel);

        // ログを送信
        const logEmbed = new EmbedBuilder()
          .setTitle('🎲 くじ引き設定変更')
          .setDescription(`設定パネルのくじ引き設定が変更されました。`)
          .setColor(0x3498db)
          .addFields(
            { name: '変更前', value: oldItems.join('\n').slice(0, 1020) || '未設定' },
            { name: '変更後', value: newItems.join('\n').slice(0, 1020) || '未設定' }
          );

        await sendSettingLog(guild, {
          user: user,
          type: 'くじ引き設定',
          embed: logEmbed, // sendSettingLogでembedを直接使えるように要改修
          message: 'くじ引き設定が変更されました。'
        });

        await interaction.editReply({ content: '✅ くじ引きの設定を更新しました。' });
        return;
      }
    }

  } catch (error) {
    logger.error('[kuzibikiBotHandler] Error:', error);
    if (interaction.isRepliable()) {
      const replyOptions = { content: '⚠️ くじ引き処理中にエラーが発生しました。', flags: MessageFlags.Ephemeral };
      if (interaction.replied || interaction.deferred) await interaction.followUp(replyOptions).catch(() => {});
      else await interaction.reply(replyOptions).catch(() => {});
    }
  }
}

/**
 * くじ引きを実行し、結果を保存・投稿する
 * @param {import('discord.js').StringSelectMenuInteraction} interaction
 * @param {number} count
 */
async function executeLottery(interaction, count) {
  const { guild, user, channel } = interaction;
  const { settings } = readKujiConfig(guild.id);
  const originalSettings = settings || [];

  // Shuffle the original settings array
  const shuffled = [...originalSettings].sort(() => 0.5 - Math.random());
  const results = [];

  // Draw without replacement
  for (let i = 0; i < count && shuffled.length > 0; i++) {
    results.push(shuffled.shift()); // Take the first element and remove it from shuffled
  }


  // スレッドを探すか作成
  const threadName = 'くじ引き-結果';
  let thread = channel.threads.cache.find(t => t.name === threadName);
  if (!thread) {
    thread = await channel.threads.create({ name: threadName, reason: 'くじ引き結果ログ' });
  }

  // 結果をGCSに保存
  saveKujiResult(guild.id, {
    timestamp: new Date().toISOString(),
    executedBy: { id: user.id, name: user.username },
    channelId: channel.id,
    threadId: thread.id,
    count,
    settings: originalSettings,
    results,
  });

  // スレッドに投稿
  const threadEmbed = new EmbedBuilder()
    .setTitle('🎲 くじ引き結果')
    .setColor(0x9b59b6)
    .addFields(
      { name: '実行者', value: `<@${user.id}>`, inline: true },
      { name: '実行時間', value: dayjs().format('YYYY/MM/DD HH:mm'), inline: true },
      { name: '回数', value: `${count}回`, inline: true },
      { name: '設定', value: originalSettings.join(', ').slice(0, 1020) || '未設定' },
      { name: '結果', value: `**${results.join(', ')}**` }
    );
  const threadMessage = await thread.send({ embeds: [threadEmbed] });

  // 管理者ログにも出力
  const adminLogEmbed = new EmbedBuilder()
    .setTitle('🎲 くじ引きが実行されました')
    .setColor(0x9b59b6)
    .addFields(
      { name: '実行者', value: `<@${user.id}>` },
      { name: 'くじ引き設定', value: originalSettings.join(', ').slice(0, 1020) || '未設定' },
      { name: '回数', value: `${count} 回` },
      { name: '結果', value: results.join(', ') },
      { name: '実行時間', value: dayjs().format('YYYY/MM/DD HH:mm') },
      { name: 'スレッドメッセージ', value: `こちら` }
    );

  await sendSettingLog(guild, {
    user,
    type: 'くじ引き実行',
    embed: adminLogEmbed,
    message: 'くじ引きが実行されました。'
  });
}

module.exports = kuzibikiBotHandler;