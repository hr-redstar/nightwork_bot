// src/handlers/kuzibiki/kuzibikiPanel.js
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');
const dayjs = require('dayjs');
const { readKujiConfig, saveKujiConfig } = require('../../utils/kuzibiki/kuzibikiStorage');

/**
 * Embed + ボタンを生成
 */
function buildPanelEmbed(config) {
  const updatedTime = config.updatedAt
    ? dayjs(config.updatedAt).format('YYYY/MM/DD HH:mm')
    : '未設定';

  return new EmbedBuilder()
    .setColor(0x00bfff)
    .setTitle('🎲 くじ引き設定一覧')
    .setDescription(
      `くじ引き設定　更新時間：${updatedTime}\n\n${
        config.settings?.length
          ? config.settings.join('\n')
          : '（設定が登録されていません）'
      }\n\nくじ引き設定内容は上記からコピーできます。`
    )
    .setFooter({ text: '設定くじ引きパネル' });
}

function buildPanelComponents() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('kuzibiki_config')
        .setLabel('くじ引き設定')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('kuzibiki_execute')
        .setLabel('くじ引き実行')
        .setStyle(ButtonStyle.Success)
    ),
  ];
}

/**
 * 既存パネルがあれば更新、なければ新規投稿
 */
async function upsertKuzibikiPanel(channel) {
  const guildId = channel.guild.id;
  const config = readKujiConfig(guildId);

  const embed = buildPanelEmbed(config);
  const components = buildPanelComponents();

  // 既に panelMessageId が保存されていれば更新を試みる
  if (config.panelMessageId) {
    try {
      const msg = await channel.messages.fetch(config.panelMessageId);
      await msg.edit({ embeds: [embed], components });
      return msg;
    } catch (e) {
      // 取得できなければ新規投下にフォールバック
    }
  }

  const panelMsg = await channel.send({ embeds: [embed], components });
  // panelMessageId を保存（設定は保持）
  const next = {
    settings: config.settings || [],
    updatedAt: config.updatedAt || null,
    panelMessageId: panelMsg.id,
  };
  saveKujiConfig(guildId, next);
  return panelMsg;
}

module.exports = { upsertKuzibikiPanel };
