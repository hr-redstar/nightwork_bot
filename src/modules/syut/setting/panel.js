const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');
const { getSyutConfig, saveSyutConfig } = require('../../../utils/syut/syutConfigManager');

/**
 * 出退勤設定パネルを設置・更新
 */
async function postSyutPanel(channel) {
  const guildId = channel.guild.id;
  const config = await getSyutConfig(guildId);

  // 埋め込み生成
  const embed = new EmbedBuilder()
    .setTitle('🕒 出退勤設定パネル')
    .setDescription('キャスト・黒服の出退勤設定を管理します。')
    .addFields(
      {
        name: '👗 キャスト出退勤一覧',
        value: formatPanelList(config.castPanelList),
      },
      {
        name: '🕴️ 黒服出退勤一覧',
        value: formatPanelList(config.kurofukuPanelList),
      },
      {
        name: '🕒 更新日時',
        value: config.lastUpdated ? `<t:${Math.floor(new Date(config.lastUpdated).getTime() / 1000)}:f>` : '未設定',
      }
    )
    .setFooter({ text: '出退勤設定パネル - 更新可能' })
    .setTimestamp();

  // ボタン
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('cast_syut_panel')
      .setLabel('キャスト出退勤パネル設置')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('kuro_syut_panel')
      .setLabel('黒服出退勤パネル設置')
      .setStyle(ButtonStyle.Secondary)
  );

  // 既存のパネルを探して更新、なければ新規投稿
  const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
  const existingPanel = messages?.find(m => m.author.id === channel.client.user.id && m.embeds[0]?.title === '🕒 出退勤設定パネル');

  if (existingPanel) {
    await existingPanel.edit({ embeds: [embed], components: [row1] });
  } else {
    await channel.send({ embeds: [embed], components: [row1] });
  }

  // 更新情報保存
  config.lastUpdated = new Date().toISOString();
  await saveSyutConfig(guildId, config);
}

/**
 * パネル一覧をフォーマット
 */
function formatPanelList(list) {
  if (!list || Object.keys(list).length === 0) return '未設定';
  // link がオブジェクト { channel, time } の場合と、文字列の場合の両方に対応
  return Object.entries(list).map(([store, value]) => {
    let channelLink = '（情報なし）';
    if (typeof value === 'string') {
      channelLink = value;
    } else if (typeof value === 'object' && value.channel) {
      channelLink = value.channel;
    }
    return `・${store}：${channelLink}`;
  }).join('\n');
}

module.exports = { postSyutPanel };
