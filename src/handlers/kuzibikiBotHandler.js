/**
 * src/handlers/kuzibikiBotHandler.js
 * くじ引き関連のインタラクションを処理
 */
const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { getKuzibikiConfig, saveKuzibikiConfig } = require('./kuzibiki/kuzibikiConfigManager');
const { updatePanel } = require('./kuzibiki/kuzibikiPanel');
const { sendSettingLog } = require('../handlers/config/configLogger');
const logger = require('../utils/logger');

async function kuzibikiBotHandler(interaction) {
  const { customId, guild, user } = interaction;

  try {
    // ============================================================
    // ボタン押下
    // ============================================================
    if (interaction.isButton()) {
      // --- くじ引き設定ボタン ---
      if (customId === 'kuji_settings') {
        const config = await getKuzibikiConfig(guild.id);
        const currentItems = config.items ? config.items.join('\n') : '';

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
    }

    // ============================================================
    // モーダル送信
    // ============================================================
    if (interaction.isModalSubmit()) {
      if (customId === 'kuji_settings_modal') {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const config = await getKuzibikiConfig(guild.id);
        const oldItems = config.items || [];

        const newItemsRaw = interaction.fields.getTextInputValue('kuji_items_input');
        const newItems = newItemsRaw.split('\n').map(s => s.trim()).filter(Boolean);

        config.items = newItems;
        await saveKuzibikiConfig(guild.id, config);

        // パネルを更新
        await updatePanel(interaction.channel, guild.id);

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

module.exports = kuzibikiBotHandler;