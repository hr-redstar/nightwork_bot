﻿/**
 * src/handlers/uriageBotHandler.js
 * 売上関連のインタラクションを処理する
 */
const logger = require('../utils/logger');
const {
  StringSelectMenuBuilder,
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
  MessageFlags,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { getStoreList } = require('../utils/config/configAccessor');
const { getUriageConfig, saveUriageConfig } = require('./uriage/uriageConfigManager');
const { postUriagePanel } = require('./uriage/uriagePanel');
const { sendSettingLog } = require('./config/configLogger');

async function handleInteraction(interaction) {
  const { customId, guild, user } = interaction;

  try {
    // ============================================================
    // ボタン押下
    // ============================================================
    if (interaction.isButton()) {
      logger.info(`[uriageBotHandler] Button: ${customId}`);

      // --- 売上報告パネル設置 ---
      if (customId === 'uriage_panel_setup') {
        const stores = await getStoreList(guild.id);
        if (!stores || stores.length === 0) {
          return interaction.reply({
            content: '⚠️ 設定されている店舗がありません。まず `/設定` コマンドで店舗を登録してください。',
            flags: MessageFlags.Ephemeral,
          });
        }

        const storeOptions = stores.map(store => ({ label: store, value: store }));
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('uriage_select_store_for_panel')
          .setPlaceholder('パネルを設置する店舗を選択')
          .addOptions(storeOptions);

        await interaction.reply({
          content: 'どの店舗の売上報告パネルを設置しますか？',
          components: [new ActionRowBuilder().addComponents(selectMenu)],
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    // ============================================================
    // セレクトメニュー
    // ============================================================
    if (interaction.isStringSelectMenu()) {
      // --- 店舗選択後 → チャンネル選択へ ---
      if (customId === 'uriage_select_store_for_panel') {
        const storeName = interaction.values[0];
        const channelSelect = new ChannelSelectMenuBuilder()
          .setCustomId(`uriage_select_channel_for_panel_${storeName}`)
          .setPlaceholder('設置先のチャンネルを選択')
          .addChannelTypes(ChannelType.GuildText);

        await interaction.update({
          content: `**${storeName}** のパネルをどのチャンネルに設置しますか？`,
          components: [new ActionRowBuilder().addComponents(channelSelect)],
        });
      }
    }

    if (interaction.isChannelSelectMenu()) {
      // --- チャンネル選択後 → パネル設置 ---
      if (customId.startsWith('uriage_select_channel_for_panel_')) {
        await interaction.deferUpdate();
        const storeName = customId.replace('uriage_select_channel_for_panel_', '');
        const channelId = interaction.values[0];
        const channel = await guild.channels.fetch(channelId);

        // 売上報告パネルを送信
        const panelEmbed = new EmbedBuilder()
          .setTitle(`💰 売上報告パネル（${storeName}）`)
          .setDescription('売上を報告する場合は、下のボタンを押してください。')
          .setColor(0x5865f2);
        const panelRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`uriage_report_${storeName}`)
            .setLabel('売上報告')
            .setStyle(ButtonStyle.Primary)
        );
        await channel.send({ embeds: [panelEmbed], components: [panelRow] });

        // 設定を保存
        const config = await getUriageConfig(guild.id);
        config.uriageChannels = config.uriageChannels || {};
        config.uriageChannels[storeName] = channelId;
        await saveUriageConfig(guild.id, config);

        // 設定パネルを更新
        await postUriagePanel(interaction.channel);

        // ログ送信
        await sendSettingLog(guild, { user, type: '売上設定', message: `**${storeName}** の売上報告パネルを <#${channelId}> に設置しました。` });

        await interaction.editReply({ content: `✅ **${storeName}** の売上報告パネルを <#${channelId}> に設置しました。`, components: [] });
      }
    } else if (interaction.isModalSubmit()) {
      logger.info(`[uriageBotHandler] Modal: ${customId}`);
      // 今後ここにモーダル処理を追加
    }
  } catch (error) {
    logger.error(`[uriageBotHandler] Error handling interaction ${customId}:`, error);
    if (interaction.isRepliable()) {
      const replyOptions = { content: '⚠️ 売上設定処理中にエラーが発生しました。', flags: MessageFlags.Ephemeral };
      if (interaction.replied || interaction.deferred) await interaction.followUp(replyOptions).catch(() => {});
      else await interaction.reply(replyOptions).catch(() => {});
    }
  }
}

module.exports = { handleInteraction };