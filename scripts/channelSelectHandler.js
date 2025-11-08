const { ActionRowBuilder, StringSelectMenuBuilder, ChannelType } = require('discord.js');
const gcs = require('../../utils/gcs');
const buildConfigPanel = require('./configPanel');
const logger = require('../../utils/logger');

const channelTypeMap = {
  'config_bot_setGlobalLogChannel': { key: 'globalLogChannel', type: 'channel' },
  'config_bot_setAdminLogChannel': { key: 'adminLogChannel', type: 'channel' },
};

/**
 * ボタン押下でチャンネル選択メニューを表示し、
 * メニュー選択で設定を保存するハンドラー
 */
module.exports = {
  // このハンドラーが複数の customId を処理することを示す
  name: 'config_bot_set',
  execute: async (interaction) => {
    if (!interaction.isButton() && !interaction.isStringSelectMenu()) return false;
    const { customId } = interaction;

    const mapping = channelTypeMap[customId];
    // ボタンIDがマップにない場合は、SelectMenuのIDから探す
    const channelKey = mapping ? mapping.key : interaction.customId.split('_').pop();

    // ------------------------
    // ボタン押下時: SelectMenu を送信
    // ------------------------
    if (interaction.isButton()) {
      const channels = interaction.guild.channels.cache
        .filter(c => c.isTextBased())
        .map(c => ({ label: `#${c.name}`, value: c.id }))
        .slice(0, 25); // 最大25件

      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`select_channel_${channelKey}`) // SelectMenu用のユニークなID
          .setPlaceholder('ログチャンネルを選択')
          .addOptions(channels)
      );

      await interaction.reply({
        content: 'チャンネルを選択してください',
        components: [row],
        ephemeral: true,
      });
      return true;
    }

    // ------------------------
    // SelectMenu 選択後: 保存 & パネル更新
    // ------------------------
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('select_channel_')) {
      const selectedChannelId = interaction.values[0];

      try {
        // GCS に保存
        const guildId = interaction.guildId;
        const configPath = gcs.guildConfigPath(guildId);
        const config = await gcs.readJSON(configPath) || {};
        config[channelKey] = selectedChannelId;
        await gcs.writeJSON(configPath, config);

        // 設定パネルを更新
        const panel = await buildConfigPanel(guildId);
        if (config.panel?.channelId && config.panel?.messageId) {
          const channel = await interaction.guild.channels.fetch(config.panel.channelId).catch(() => null);
          const message = await channel?.messages.fetch(config.panel.messageId).catch(() => null);
          if (message) await message.edit(panel);
        }

        await interaction.update({
          content: `✅ **${channelKey}** を <#${selectedChannelId}> に設定しました。`,
          components: [],
        });
      } catch (err) {
        logger.error(`[channelSelectHandler] ${channelKey} の設定保存中にエラー`, err);
        await interaction.update({
          content: '❌ 設定の保存中にエラーが発生しました。',
          components: [],
        });
      }

      return true;
    }

    return false;
  },
};
