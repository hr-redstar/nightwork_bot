// src/handlers/keihi/経費設定/keihiPanel_actions.js
const {
  StringSelectMenuBuilder,
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
  EmbedBuilder,
  MessageFlags,
} = require('discord.js');

const dayjs = require('dayjs');

const {
  loadKeihiConfig,
  saveKeihiConfig,
} = require('../../../utils/keihi/keihiConfigManager');

const {
  updateKeihiPanel,
} = require('./keihiPanel_Config'); // 設定パネルを更新する

const {
  postStoreKeihiPanel,
} = require('./keihiPanel_storePanel');

const {
  loadStoreRoleConfig,
} = require('../../../utils/config/storeRoleConfigManager');

const {
  getGuildConfig,
} = require('../../../utils/config/gcsConfigManager');

// ======================================================
// 1. パネル設置の開始（店舗選択）
// ======================================================
async function handlePanelSetup(interaction) {
  const storeConfig = await loadStoreRoleConfig(interaction.guildId);

  if (!storeConfig.stores?.length) {
    return interaction.reply({
      content: '⚠️ 店舗が登録されていません。設定パネルで追加してください。',
      flags: MessageFlags.Ephemeral,
    });
  }

  const selectStore = new StringSelectMenuBuilder()
    .setCustomId('keihi:config:select:store')
    .setPlaceholder('店舗を選択してください')
    .addOptions(storeConfig.stores.map(store => ({
      label: store,
      value: encodeURIComponent(store),
    })));

  const row = new ActionRowBuilder().addComponents(selectStore);

  await interaction.reply({
    content: '🏪 経費パネルを設置する店舗を選んでください。',
    components: [row],
    flags: MessageFlags.Ephemeral,
  });
}

// ======================================================
// 2. 店舗を選択するとチャンネル選択を表示
// ======================================================
async function handleStoreSelectForPanel(interaction) {
  const storeEncoded = interaction.values[0];
  const store = decodeURIComponent(storeEncoded);

  const channelSelect = new ChannelSelectMenuBuilder()
    .setCustomId(`keihi:config:select:channel:${storeEncoded}`)
    .setPlaceholder(`${store} のパネル設置チャンネルを選択`)
    .addChannelTypes(ChannelType.GuildText);

  const row = new ActionRowBuilder().addComponents(channelSelect);

  await interaction.update({
    content: `📢 **${store}** のパネルを設置するチャンネルを選んでください：`,
    components: [row],
  });
}

// ======================================================
// 3. チャンネルが選択された → パネルを設置して設定更新
// ======================================================
async function handleChannelSelectForPanel(interaction) {
  await interaction.deferUpdate();

  const guildId = interaction.guildId;
  const guild = interaction.guild;

  const parts = interaction.customId.split(':'); // ['keihi','config','select','channel','<encodedStore>']
  const storeEncoded = parts[4];
  const store = decodeURIComponent(storeEncoded);

  const channelId = interaction.values[0];
  const channel = guild.channels.cache.get(channelId);

  // コンフィグ反映
  const keihiConfig = await loadKeihiConfig(guildId);
  keihiConfig.stores = keihiConfig.stores || {};
  keihiConfig.stores[store] = channelId;
  await saveKeihiConfig(guildId, keihiConfig);

  // パネル設置
  await postStoreKeihiPanel(channel, store, guildId);

  // 設定パネルを更新
  await updateKeihiPanel(interaction);

  // 設定ログ
  const globalConfig = await getGuildConfig(guildId);
  const logThreadId = globalConfig.settingLogThread;

  if (logThreadId) {
    const logThread = await guild.channels.fetch(logThreadId).catch(() => null);
    if (logThread?.isTextBased()) {
      const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle('⚙️ 経費設定変更')
        .setDescription('経費パネルが新しく設置されました。')
        .addFields(
          { name: '店舗', value: store, inline: true },
          { name: 'チャンネル', value: `<#${channelId}>`, inline: true },
          { name: '実行者', value: `<@${interaction.user.id}>` },
          { name: '実行時間', value: dayjs().format('YYYY/MM/DD HH:mm') },
        );

      await logThread.send({ embeds: [embed] });
    }
  }

  await interaction.followUp({
    content: `✅ **${store}** の経費パネルを <#${channelId}> に設置しました。`,
    flags: MessageFlags.Ephemeral,
  });
}

// ======================================================
// 4. ロール選択を開始（ボタン → ロール一覧表示）
// ======================================================
async function handleRoleSelect(interaction) {
  const type = interaction.customId.split(':')[3]; // approver / viewer / applicant
  const label = {
    approver: '承認役職',
    viewer: '閲覧役職',
    applicant: '申請役職',
  }[type];

  const storeRoles = await loadStoreRoleConfig(interaction.guildId);

  if (!storeRoles?.roles?.length) {
    return interaction.reply({
      content: '⚠️ まだ役職が登録されていません。',
      flags: MessageFlags.Ephemeral,
    });
  }

  const options = storeRoles.roles
    .map(r => ({ label: r.name || r, value: r.id || r }))
    .slice(0, 25);

  const select = new StringSelectMenuBuilder()
    .setCustomId(`keihi:config:select:role:${type}`)
    .setPlaceholder(`${label}を選択してください`)
    .addOptions(options);

  await interaction.reply({
    content: `👥 ${label}を選択してください：`,
    components: [new ActionRowBuilder().addComponents(select)],
    flags: MessageFlags.Ephemeral,
  });
}

// ======================================================
// 5. 選択されたロールを保存しパネル更新
// ======================================================
async function handleRoleSelectSubmit(interaction) {
  const guildId = interaction.guildId;
  const guild = interaction.guild;

  const parts = interaction.customId.split(':');
  const type = parts[4]; // approver / viewer / applicant
  const selectedRoleId = interaction.values[0];

  const keihiConfig = await loadKeihiConfig(guildId);
  keihiConfig.roles = keihiConfig.roles || {};
  keihiConfig.roles[type] = selectedRoleId;
  await saveKeihiConfig(guildId, keihiConfig);

  await interaction.deferUpdate();

  await interaction.followUp({
    content: `✅ ${{
      approver: '承認役職',
      viewer: '閲覧役職',
      applicant: '申請役職',
    }[type]} を <@&${selectedRoleId}> に設定しました。`,
    flags: MessageFlags.Ephemeral,
  });

  await updateKeihiPanel(interaction);

  // 設定ログ
  const globalConfig = await getGuildConfig(guildId);
  const logThreadId = globalConfig.settingLogThread;

  if (logThreadId) {
    const logThread = await guild.channels.fetch(logThreadId).catch(() => null);
    if (logThread?.isTextBased()) {
      const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle('⚙️ 経費設定変更')
        .setDescription('役職設定が更新されました。')
        .addFields(
          { name: '種類', value: type, inline: true },
          { name: '役職', value: `<@&${selectedRoleId}>`, inline: true },
          { name: '実行者', value: `<@${interaction.user.id}>` },
          { name: '実行時間', value: dayjs().format('YYYY/MM/DD HH:mm') },
        );

      await logThread.send({ embeds: [embed] });
    }
  }
}

module.exports = {
  handlePanelSetup,
  handleRoleSelect,
  handleRoleSelectSubmit,
  handleStoreSelectForPanel,
  handleChannelSelectForPanel,
};
