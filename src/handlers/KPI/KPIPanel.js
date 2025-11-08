/**
 * src/handlers/KPI/KPIPanel.js
 * KPI設定パネル（管理者向け）
 */

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { getGuildConfig } = require('../../utils/config/gcsConfigManager');

/**
 * KPI設定パネルを投稿
 * @param {import('discord.js').TextChannel} channel
 */
async function postKpiPanel(channel) {
  try {
    const guildId = channel.guild.id;
    const config = await getGuildConfig(guildId);

    const storeData = config?.KPI || {};
    const storeList = Object.keys(storeData).length
      ? Object.keys(storeData)
          .map((store) => {
            const link = storeData[store]?.channelLink || '未設定';
            return `🏬 **${store}**：${link}`;
          })
          .join('\n')
      : '店舗がまだ設定されていません。';

    const embed = new EmbedBuilder()
      .setTitle('📊 KPI設定パネル')
      .setDescription(
        `以下の設定を行うことができます。\n\n` +
          `**設置店舗一覧**\n${storeList}\n\n` +
          `**KPI承認役職**\n${config?.KPIApproveRoleName || '未設定'}`
      )
      .setColor(0x0099ff)
      .setFooter({ text: 'ナイトワーク向け 業務改善bot | KPI設定' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('kpi_setup_store')
        .setLabel('🏢 KPI設置')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('kpi_role_setup')
        .setLabel('🧩 KPI承認役職')
        .setStyle(ButtonStyle.Secondary)
    );

    await channel.send({ embeds: [embed], components: [row] });
  } catch (err) {
    console.error('❌ KPIパネル送信エラー:', err);
  }
}

module.exports = {
  postKpiPanel,
};
