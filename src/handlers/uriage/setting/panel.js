// src/handlers/uriage/setting/panel.js
// ----------------------------------------------------
// 売上設定パネル表示
//   - /設定売上 から呼び出し
// ----------------------------------------------------

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');

const { IDS } = require('./ids');
const {
  loadUriageConfig,
} = require('../../../utils/uriage/uriageConfigManager');
const {
  loadStoreRoleConfig,
} = require('../../../utils/config/storeRoleConfigManager');

/**
 * 売上設定パネルを表示
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 */
async function sendUriageSettingPanel(interaction) {
  const guildId = interaction.guild.id;

  const [config, storeRoleConfig] = await Promise.all([
    loadUriageConfig(guildId),
    loadStoreRoleConfig(guildId),
  ]);

  const embed = new EmbedBuilder()
    .setTitle('💰 売上設定パネル')
    .setDescription('店舗ごとの売上報告パネル・権限などを設定します。');

  const fields = [];

  // 店舗一覧（stores が配列の場合のみ処理）
  const stores = Array.isArray(storeRoleConfig?.stores)
    ? storeRoleConfig.stores
    : [];

  if (stores.length > 0) {
    const panels = config?.panels ?? {};

    for (const store of stores) {
      const storeName = String(store.name ?? '店舗');
      const key = String(store.id ?? storeName);
      const panelInfo = panels[key] ?? {};
      const ch = panelInfo.channelId ? `<#${panelInfo.channelId}>` : '未設定';

      fields.push({
        name: storeName,
        value: `売上報告パネル: ${ch}`,
        inline: false,
      });
    }
  } else {
    embed.setFooter({
      text: '※ 店舗情報が未設定です。/設定店舗情報 などで店舗を設定してください。',
    });
  }

  // fields が 1件以上あるときだけ addFields する（空配列で投げない）
  if (fields.length > 0) {
    embed.addFields(fields);
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(IDS.BTN_OPEN_PANEL_LOCATION)
      .setLabel('売上パネル設置')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(IDS.BTN_OPEN_CSV_SETTING)
      .setLabel('CSV設定')
      .setStyle(ButtonStyle.Secondary),
  );

  const payload = {
    embeds: [embed],
    components: [row],
    ephemeral: true,
  };

  // /設定売上 側で deferReply してるので、基本 followUp になる
  if (interaction.deferred || interaction.replied) {
    return interaction.followUp(payload);
  }
  return interaction.reply(payload);
}

module.exports = {
  sendUriageSettingPanel,
};
