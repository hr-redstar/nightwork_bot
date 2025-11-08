const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getGuildConfig } = require('../../utils/config/gcsConfigManager');

function fmtStoreChannels(map) {
  if (!map || !Object.keys(map).length) return '未設定';
  return Object.entries(map).map(([store, ch]) => `🏪 ${store}：<#${ch}>`).join('\n');
}

async function postSyutPanel(channel) {
  const guildId = channel.guild.id;
  const cfg = (await getGuildConfig(guildId)) || {};
  const embed = new EmbedBuilder()
    .setTitle('🕓 出退勤設定パネル')
    .setDescription('キャスト／黒服の出退勤管理を設定します。')
    .addFields(
      { name: '👠 キャスト出退勤一覧', value: fmtStoreChannels(cfg.syutCastChannels), inline: false },
      { name: '🕴️ 黒服出退勤一覧', value: fmtStoreChannels(cfg.syutBlackChannels), inline: false },
    )
    .setColor(0x1abc9c);

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('syut_cast_setup').setLabel('👠 キャスト出退勤パネル設置').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('syut_black_setup').setLabel('🕴️ 黒服出退勤パネル設置').setStyle(ButtonStyle.Primary),
  );

  await channel.send({ embeds: [embed], components: [row1] });
}

module.exports = { postSyutPanel };
