const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} = require('discord.js');
const { getGuildConfig, setGuildConfig } = require('../../utils/config/gcsConfigManager');
const { postUriagePanel } = require('./uriagePanel');
const { sendSettingLog } = require('../config/configLogger');

/**
 * 売上報告パネルを指定チャンネルに設置
 * @param {Interaction} interaction - Discord interaction
 * @param {string} storeName - 店舗名
 * @param {string} channelId - 対象チャンネル
 */
async function createUriageReportPanel(interaction, storeName, channelId) {
  try {
    const guild = interaction.guild;
    const targetChannel = guild.channels.cache.get(channelId);
    if (!targetChannel) {
      return interaction.reply({
        content: '⚠️ 指定したチャンネルが見つかりません。',
        ephemeral: true,
      });
    }

    // パネルEmbed
    const embed = new EmbedBuilder()
      .setTitle(`🏪 ${storeName} 売上報告パネル`)
      .setDescription(
        '売上報告を行う場合は以下のボタンを押してください。\n' +
          '報告後、承認スレッドが自動生成されます。'
      )
      .setColor(0xf1c40f);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`uriage_report_${storeName}`)
        .setLabel('💰 売上報告')
        .setStyle(ButtonStyle.Primary)
    );

    // チャンネルに投稿
    const message = await targetChannel.send({
      embeds: [embed],
      components: [row],
    });

    // GCSに登録
    const config = (await getGuildConfig(guild.id)) || {};
    if (!config.uriageChannels) config.uriageChannels = {};
    config.uriageChannels[storeName] = channelId;
    await setGuildConfig(guild.id, config);

    // 設定ログ出力
    await sendSettingLog(interaction.guild, {
      user: interaction.user,
      message: `🏪 **${storeName}** の売上報告パネルを <#${channelId}> に設置しました。`,
      type: '売上報告パネル設置',
    });

    await interaction.reply({
      content: `✅ ${storeName} の売上報告パネルを設置しました。`,
      ephemeral: true,
    });

    // メイン設定パネル更新
    await postUriagePanel(interaction.channel);
  } catch (err) {
    console.error('❌ 売上報告パネル設置エラー:', err);
    await interaction.reply({
      content: '⚠️ 売上報告パネルの設置に失敗しました。',
      ephemeral: true,
    });
  }
}

module.exports = { createUriageReportPanel };
