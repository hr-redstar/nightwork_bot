const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { getGuildConfig, setGuildConfig } = require('../../utils/config/gcsConfigManager');
const { getStoreList } = require('../../utils/config/configAccessor');

/**
 * 売上設定パネルを投稿 or 更新
 */
async function postUriagePanel(channel) {
  const guildId = channel.guild.id;
  const config = (await getGuildConfig(guildId)) || {};
  const stores = await getStoreList(guildId);

  const embed = new EmbedBuilder()
    .setTitle('💰 売上設定パネル')
    .setDescription('売上報告・承認・CSV出力の設定を行います。')
    .setColor(0xf1c40f)
    .addFields([
      { name: '📋 売上報告パネル一覧', value: formatStoreChannelList(config), inline: false },
      { name: '🧑‍💼 承認ロール・役職', value: formatRoles(config.uriageApprovalRoles), inline: true },
      { name: '👀 閲覧ロール・役職', value: formatRoles(config.uriageViewRoles), inline: true },
    ]);

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('uriage_panel_setup')
      .setLabel('🧾 売上報告パネル設置')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('uriage_set_approval')
      .setLabel('🧑‍💼 承認ロール・役職')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('uriage_set_view')
      .setLabel('👀 閲覧ロール・役職')
      .setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('uriage_csv_export')
      .setLabel('📊 CSV発行')
      .setStyle(ButtonStyle.Success)
  );

  await channel.send({ embeds: [embed], components: [row1, row2] });
}

function formatStoreChannelList(config) {
  if (!config.uriageChannels || Object.keys(config.uriageChannels).length === 0)
    return '未設定';
  return Object.entries(config.uriageChannels)
    .map(([store, chId]) => `🏪 **${store}**：<#${chId}>`)
    .join('\n');
}

function formatRoles(roleIds) {
  if (!roleIds || roleIds.length === 0) return '未設定';
  return roleIds.map((id) => `<@&${id}>`).join(', ');
}

module.exports = { postUriagePanel };
