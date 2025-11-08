// src/handlers/syut/syutPanel_config.js
const { StringSelectMenuBuilder, ActionRowBuilder, ChannelType } = require('discord.js');
const { getStoreList } = require('../../utils/config/configAccessor');
const { postSyutPanel } = require('./syutPanel');
const { createCastPanel } = require('./syutCastPanel');
const { createBlackPanel } = require('./syutBlackPanel');
const { getGuildConfig, setGuildConfig } = require('../../utils/config/gcsConfigManager');
const { sendSettingLog } = require('../config/configLogger');

async function showSetupMenus(interaction, kind /* 'cast' | 'black' */) {
  const stores = await getStoreList(interaction.guild.id);
  if (!stores.length) {
    return interaction.reply({ content: '⚠️ 店舗が未登録です。先に /設定 で登録してください。', ephemeral: true });
  }
  const storeSelect = new StringSelectMenuBuilder()
    .setCustomId(`syut_select_store_${kind}`)
    .setPlaceholder('店舗を選択')
    .addOptions(stores.map(s => ({ label: s, value: s })));

  const channels = interaction.guild.channels.cache
    .filter(ch => ch.type === ChannelType.GuildText)
    .map(ch => ({ label: ch.name, value: ch.id }));

  const channelSelect = new StringSelectMenuBuilder()
    .setCustomId(`syut_select_channel_${kind}`)
    .setPlaceholder('テキストチャンネルを選択')
    .addOptions(channels.slice(0, 25));

  await interaction.reply({
    content: kind === 'cast' ? '👠 キャスト出退勤パネル：店舗とチャンネルを選択' : '🕴️ 黒服出退勤パネル：店舗とチャンネルを選択',
    components: [new ActionRowBuilder().addComponents(storeSelect), new ActionRowBuilder().addComponents(channelSelect)],
    ephemeral: true,
  });
}

async function handleSetupSubmit(interaction, kind, storeName, channelId) {
  if (kind === 'cast') {
    await createCastPanel(interaction, storeName, channelId);
  } else {
    await createBlackPanel(interaction, storeName, channelId);
  }
  // 保存（マッピングは各パネル作成内で行うが、ここでも冪等化のため再設定）
  const cfg = (await getGuildConfig(interaction.guild.id)) || {};
  const key = kind === 'cast' ? 'syutCastChannels' : 'syutBlackChannels';
  if (!cfg[key]) cfg[key] = {};
  cfg[key][storeName] = channelId;
  await setGuildConfig(interaction.guild.id, cfg);

  await sendSettingLog(interaction.guild, {
    user: interaction.user,
    message: `${kind === 'cast' ? '👠 キャスト' : '🕴️ 黒服'} 出退勤パネルを <#${channelId}> に設置（店舗：**${storeName}**）`,
    type: '出退勤設定',
  });

  await postSyutPanel(interaction.channel);
}

// 追記：選択された店舗を default=true でメッセージに反映
async function reflectSelectedStore(interaction, kind) {
  // kind: 'cast' | 'black'
  const selectedStore = interaction.values[0];

  // 既存の2つのセレクト（店舗 / チャンネル）を再構築
  const storeMenuRaw = interaction.message.components[0].components[0];
  const channelMenuRaw = interaction.message.components[1].components[0];

  const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder } = require('discord.js');

  // 店舗メニュー：選択中の店舗に default=true を付与
  const newStoreMenu = new StringSelectMenuBuilder()
    .setCustomId(`syut_select_store_${kind}`)
    .setPlaceholder('店舗を選択')
    .addOptions(
      storeMenuRaw.options.map(opt =>
        new StringSelectMenuOptionBuilder()
          .setLabel(opt.label)
          .setValue(opt.value)
          .setDefault(opt.value === selectedStore)
      )
    );

  // チャンネルメニュー：そのまま引き継ぐ（customIdも維持）
  const newChannelMenu = new StringSelectMenuBuilder()
    .setCustomId(`syut_select_channel_${kind}`)
    .setPlaceholder(channelMenuRaw.placeholder || 'テキストチャンネルを選択')
    .addOptions(
      channelMenuRaw.options.map(opt =>
        new StringSelectMenuOptionBuilder()
          .setLabel(opt.label)
          .setValue(opt.value)
      )
    );

  await interaction.update({
    content: interaction.message.content,
    components: [
      new ActionRowBuilder().addComponents(newStoreMenu),
      new ActionRowBuilder().addComponents(newChannelMenu),
    ],
  });
}

module.exports = {
  // 既存のエクスポートにこれを追加
  showSetupMenus,
  handleSetupSubmit,
  reflectSelectedStore,
};