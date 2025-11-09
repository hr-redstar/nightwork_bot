// src/handlers/keihi/keihiPanel_actions.js
const {
  StringSelectMenuBuilder,
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
  EmbedBuilder,
  MessageFlags,
} = require('discord.js');
const dayjs = require('dayjs');
const { loadKeihiConfig, saveKeihiConfig } = require('../../utils/keihi/keihiConfigManager');
const { sendConfigPanel } = require('./keihiPanel_Config');
const { postStoreKeihiPanel } = require('./keihiPanel_storePanel');
const { loadStoreRoleConfig } = require('../../utils/config/storeRoleConfigManager');

/**
 * 経費設定パネルの操作を管理
 */
async function handleKeihiPanelAction(interaction) {
  const customId = interaction.customId;

  if (customId === 'keihi_set_panel') return handlePanelSetup(interaction);
  if (customId === 'keihi_set_approval') return handleRoleSelect(interaction, 'approval', '承認役職');
  if (customId === 'keihi_set_view') return handleRoleSelect(interaction, 'view', '閲覧役職');
  if (customId === 'keihi_set_request') return handleRoleSelect(interaction, 'request', '申請役職');
}

/**
 * 承認／閲覧／申請役職選択ボタンの処理
 * @param {import('discord.js').Interaction} interaction
 * @param {string} type - 'approval', 'view', or 'request'
 * @param {string} label - The display label for the role type.
 */
async function handleRoleSelect(interaction, type, label) {
  const storeRoleConfig = await loadStoreRoleConfig(interaction.guildId);
  if (!storeRoleConfig.roles || storeRoleConfig.roles.length === 0) {
    return interaction.reply({
      content: '⚠️ まだ役職が設定パネルで登録されていません。',
      flags: MessageFlags.Ephemeral,
    });
  }

  const options = storeRoleConfig.roles.map(r => ({ label: r, value: r })).slice(0, 25);

  const select = new StringSelectMenuBuilder()
    .setCustomId(`keihi_select_role_${type}`)
    .setPlaceholder(`${label}を選択してください`)
    .addOptions(options);

  const row = new ActionRowBuilder().addComponents(select);
  await interaction.reply({
    content: `👥 ${label}を選択してください：`,
    components: [row],
    flags: MessageFlags.Ephemeral,
  });
}

/**
 * 経費パネル設置ボタンの処理
 * @param {import('discord.js').Interaction} interaction
 */
async function handlePanelSetup(interaction) {
  const storeRoleConfig = await loadStoreRoleConfig(interaction.guildId);
  if (!storeRoleConfig.stores || storeRoleConfig.stores.length === 0) {
    return interaction.reply({
      content: '⚠️ 店舗が登録されていません。設定パネルで追加してください。',
      flags: MessageFlags.Ephemeral,
    });
  }

  const storeSelect = new StringSelectMenuBuilder()
    .setCustomId('keihi_select_store')
    .setPlaceholder('店舗を選択してください')
    .addOptions(storeRoleConfig.stores.map(s => ({ label: s, value: s })));

  const row = new ActionRowBuilder().addComponents(storeSelect);
  await interaction.reply({
    content: '🏪 経費パネルを設置する店舗を選んでください。',
    components: [row],
    flags: MessageFlags.Ephemeral,
  });
}

/**
 * 役職選択メニューの選択肢が送信されたときの処理
 */
async function handleRoleSelectSubmit(interaction) {
  const guildId = interaction.guildId;
  const guild = interaction.guild;
  const type = interaction.customId.replace('keihi_select_role_', '');
  const selected = interaction.values[0];
  const label = { approval: '承認役職', view: '閲覧役職', request: '申請役職' }[type];

  const keihiConfig = await loadKeihiConfig(guildId);
  keihiConfig.roles = keihiConfig.roles || {};
  keihiConfig.roles[type] = selected;
  await saveKeihiConfig(guildId, keihiConfig);

  await interaction.reply({ content: `✅ ${label}を「${selected}」に設定しました。`, flags: MessageFlags.Ephemeral });

  await sendConfigPanel(interaction.channel, guildId);

  // 設定ログスレッドにログ出力
  const globalConfig = await getGuildConfig(guildId);
  const logThreadId = globalConfig.settingLogThread;
  if (logThreadId) {
    const logThread = await guild.channels.fetch(logThreadId).catch(() => null);
    if (logThread && logThread.isTextBased()) {
      const logEmbed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle('⚙️ 経費設定変更')
        .setDescription(`${label}が更新されました。`)
        .addFields(
          { name: '変更内容', value: label, inline: true },
          { name: '変更後', value: selected, inline: true },
          { name: '実行者', value: `<@${interaction.user.id}>` },
          { name: '実行時間', value: dayjs().format('YYYY/MM/DD HH:mm') }
        );
      await logThread.send({ embeds: [logEmbed] });
    }
  }
}

/**
 * 店舗選択メニューの選択肢が送信されたときの処理
 */
async function handleStoreSelectForPanel(interaction) {
  const selectedStore = interaction.values[0];

  const chSelect = new ChannelSelectMenuBuilder()
    .setCustomId(`keihi_select_channel_${selectedStore}`)
    .setPlaceholder('経費パネルを設置するチャンネルを選択')
    .addChannelTypes(ChannelType.GuildText);

  const row = new ActionRowBuilder().addComponents(chSelect);
  await interaction.reply({
    content: `📢 ${selectedStore} の経費パネル設置チャンネルを選択してください：`,
    components: [row],
    flags: MessageFlags.Ephemeral,
  });
}

/**
 * チャンネル選択メニューの選択肢が送信されたときの処理
 */
async function handleChannelSelectForPanel(interaction) {
  const guildId = interaction.guildId;
  const guild = interaction.guild;
  const selectedStore = interaction.customId.replace('keihi_select_channel_', '');
  const channelId = interaction.values[0];
  const channel = guild.channels.cache.get(channelId);

  const keihiConfig = await loadKeihiConfig(guildId);
  keihiConfig.stores = keihiConfig.stores || {};
  keihiConfig.stores[selectedStore] = channelId;
  await saveKeihiConfig(guildId, keihiConfig);
  await postStoreKeihiPanel(channel, selectedStore, guildId);

  // メインの設定パネルを更新
  await sendConfigPanel(interaction.channel, guildId);

  // 設定ログスレッドにログ出力
  const globalConfig = await getGuildConfig(guildId);
  const logThreadId = globalConfig.settingLogThread;
  if (logThreadId) {
    const logThread = await guild.channels.fetch(logThreadId).catch(() => null);
    if (logThread && logThread.isTextBased()) {
      const logEmbed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle('⚙️ 経費設定変更')
        .setDescription('経費パネルが設置されました。')
        .addFields(
          { name: '店舗', value: selectedStore, inline: true },
          { name: '設置チャンネル', value: `<#${channelId}>`, inline: true },
          { name: '実行者', value: `<@${interaction.user.id}>` },
          { name: '実行時間', value: dayjs().format('YYYY/MM/DD HH:mm') }
        );
      await logThread.send({ embeds: [logEmbed] });
    }
  }

  await interaction.reply({ content: `✅ ${selectedStore} の経費パネルを <#${channelId}> に設置しました。`, flags: MessageFlags.Ephemeral });
}

module.exports = {
  handleKeihiPanelAction,
  handleRoleSelectSubmit,
  handleStoreSelectForPanel,
  handleChannelSelectForPanel,
};
