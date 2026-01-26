// src/handlers/syut/syutPanel_config.js
const { StringSelectMenuBuilder, ActionRowBuilder, ChannelType, ChannelSelectMenuBuilder, MessageFlags } = require('discord.js');
const { getStoreList } = require('../../../utils/config/configAccessor');
const { postSyutPanel } = require('./panel'); // Assuming you migrate syutPanel.js to setting/panel.js later or point to the new one.
const { postCastPanel } = require('../cast/panel');
const { createBlackPanel } = require('../kuro/panel');
const { getGuildConfig, setGuildConfig } = require('../../../utils/config/gcsConfigManager');
const { sendSettingLog } = require('../../../utils/config/configLogger');
const { reloadSyutCron } = require('../../../utils/syut/syutCron'); // 追加

/**
 * 店舗選択メニューを表示する
 * @param {import('discord.js').Interaction} interaction
 * @param {'cast' | 'black'} kind
 */
async function showSetupMenus(interaction, kind /* 'cast' | 'black' */) {
  const stores = await getStoreList(interaction.guild.id);
  if (!stores.length) {
    return interaction.reply({ content: '⚠️ 店舗が未登録です。先に /設定 で登録してください。', flags: MessageFlags.Ephemeral });
  }
  const storeSelect = new StringSelectMenuBuilder()
    .setCustomId(`syut_select_store:${kind}`) // 新しいID体系に合わせる
    .setPlaceholder('店舗を選択')
    .addOptions(stores.map(s => ({ label: s, value: s })));

  await interaction.reply({
    content: `どの店舗のパネルを設置しますか？（${kind === 'cast' ? 'キャスト' : '黒服'}）`,
    components: [new ActionRowBuilder().addComponents(storeSelect)],
    flags: MessageFlags.Ephemeral,
  });
}

async function showChannelSelect(interaction, kind, storeName) {
  const channelSelect = new ChannelSelectMenuBuilder()
    .setCustomId(`syut_select_channel:${kind}:${storeName}`)
    .setPlaceholder('パネルを設置するチャンネルを選択')
    .addChannelTypes(ChannelType.GuildText);

  await interaction.update({
    content: `✅ 店舗「**${storeName}**」を選択しました。\n次に、パネルを設置するチャンネルを選択してください。`,
    components: [new ActionRowBuilder().addComponents(channelSelect)],
  });
}

async function handleSetupSubmit(interaction, kind, storeName, channelId) {
  const channel = interaction.guild.channels.cache.get(channelId);
  if (!channel) return;

  if (kind === 'cast') {
    await postCastPanel(channel, storeName);
  } else {
    await createBlackPanel(interaction, storeName, channelId);
  }

  const config = await getSyutConfig(interaction.guild.id);
  config.castPanelList ||= {};
  config.castPanelList[storeName] ||= {};
  config.castPanelList[storeName].panelChannelId = channel.id;
  await saveSyutConfig(interaction.guild.id, config);

  // スケジュール再読み込み
  reloadSyutCron(interaction.client).catch(e => console.error(e));

  // メインの設定パネルを更新して、新しい設定を反映させる
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
  showChannelSelect,
  reflectSelectedStore,
};