// src/handlers/common/featureSettingHandlerTemplate.js
// ----------------------------------------------------
// 汎用: 機能ごとの「設定パネル」のボタン・セレクト共通ロジック
// ----------------------------------------------------

const {
  StringSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
  ActionRowBuilder,
  EmbedBuilder,
  MessageFlags,
} = require('discord.js');
const dayjs = require('dayjs');
const { loadStoreRoleConfig } = require('../../utils/config/storeRoleConfigManager');
const { getGuildConfig } = require('../../utils/config/gcsConfigManager');
const { createFeatureIds } = require('../../utils/feature/featureIdsTemplate');

/**
 * @param {object} deps
 * @param {string} deps.featureKey
 * @param {string} deps.featureLabel
 * @param {Function} deps.loadFeatureConfig
 * @param {Function} deps.saveFeatureConfig
 * @param {Function} deps.buildFeatureSettingPanel  // 上で作った builder
 * @param {Function} deps.postStorePanel           // 店舗ごとの ②パネル送信関数
 */
function createFeatureSettingHandler({
  featureKey,
  featureLabel,
  loadFeatureConfig,
  saveFeatureConfig,
  buildFeatureSettingPanel,
  postStorePanel,
}) {
  const IDS = createFeatureIds(featureKey, featureLabel);

  // ---------- 承認/閲覧/申請役職 選択ボタン押下 ----------
  async function openRoleSelect(interaction, roleType) {
    const guildId = interaction.guildId;
    const storeRoleConfig = await loadStoreRoleConfig(guildId);

    if (!storeRoleConfig?.roles || storeRoleConfig.roles.length === 0) {
      return interaction.reply({
        content: '⚠️ まだ役職が店舗情報に登録されていません。',
        flags: MessageFlags.Ephemeral,
      });
    }

    const labelMap = {
      approver: '承認役職',
      viewer: '閲覧役職',
      applicant: '申請/報告役職',
    };

    const options = storeRoleConfig.roles
      .slice(0, 25)
      .map((r) => ({ label: r.name || r, value: r.id || r }));

    const select = new StringSelectMenuBuilder()
      .setCustomId(IDS.SELECT_CONFIG_ROLE(roleType))
      .setPlaceholder(`${labelMap[roleType]}を選択してください`)
      .setMinValues(1)
      .setMaxValues(Math.min(5, options.length))
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(select);

    await interaction.reply({
      content: `👥 ${labelMap[roleType]}を選択してください：`,
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  }

  // ---------- 役職選択の決定 ----------
  async function handleRoleSelectSubmit(interaction) {
    const guildId = interaction.guildId;
    const guild = interaction.guild;
    const parts = interaction.customId.split(':');
    const roleType = parts[parts.length - 1]; // approver / viewer / applicant

    const selectedRoleIds = interaction.values; // 複数
    const labelMap = {
      approver: '承認役職',
      viewer: '閲覧役職',
      applicant: '申請/報告役職',
    };

    const config = await loadFeatureConfig(guildId);
    config.roles = config.roles || { approver: [], viewer: [], applicant: [] };
    config.roles[roleType] = selectedRoleIds;
    await saveFeatureConfig(guildId, config);

    await interaction.deferUpdate();
    await interaction.followUp({
      content: `✅ ${labelMap[roleType]}を ${selectedRoleIds.map((id) => `<@&${id}>`).join(' / ')} に設定しました。`,
      flags: MessageFlags.Ephemeral,
    });

    // 設定パネルを再描画（同じメッセージを更新）
    const panel = await buildFeatureSettingPanel({
      guild,
      featureKey,
      featureLabel,
      loadFeatureConfig,
    });
    await interaction.message.edit(panel);

    // 設定ログに出す
    const globalConfig = await getGuildConfig(guildId);
    const logThreadId = globalConfig.settingLogThread;
    if (logThreadId) {
      const logThread = await guild.channels.fetch(logThreadId).catch(() => null);
      if (logThread && logThread.isTextBased()) {
        const logEmbed = new EmbedBuilder()
          .setColor('#3498db')
          .setTitle(`⚙️ ${featureLabel}設定変更`)
          .setDescription(`${labelMap[roleType]}が更新されました。`)
          .addFields(
            { name: '変更種別', value: labelMap[roleType], inline: true },
            {
              name: '変更後',
              value: selectedRoleIds.map((id) => `<@&${id}>`).join('\n'),
              inline: true,
            },
            { name: '実行者', value: `<@${interaction.user.id}>` },
            { name: '実行時間', value: dayjs().format('YYYY/MM/DD HH:mm') },
          );
        await logThread.send({ embeds: [logEmbed] });
      }
    }
  }

  // ---------- パネル設置ボタン押下 → 店舗選択 ----------
  async function openPanelSetupStoreSelect(interaction) {
    const guildId = interaction.guildId;
    const storeRoleConfig = await loadStoreRoleConfig(guildId);

    if (!storeRoleConfig.stores || storeRoleConfig.stores.length === 0) {
      return interaction.reply({
        content: '⚠️ 店舗が登録されていません。[店舗情報設定]から店舗を追加してください。',
        flags: MessageFlags.Ephemeral,
      });
    }

    const storeSelect = new StringSelectMenuBuilder()
      .setCustomId(IDS.SELECT_CONFIG_STORE())
      .setPlaceholder('店舗を選択してください')
      .addOptions(storeRoleConfig.stores.map((s) => ({ label: s, value: s })));

    const row = new ActionRowBuilder().addComponents(storeSelect);

    await interaction.reply({
      content: `🏪 ${featureLabel}パネルを設置する店舗を選んでください。`,
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  }

  // ---------- 店舗選択後 → チャンネル選択 ----------
  async function handleStoreSelectForPanel(interaction) {
    const storeName = interaction.values[0];

    const chSelect = new ChannelSelectMenuBuilder()
      .setCustomId(IDS.SELECT_CONFIG_CHANNEL(storeName))
      .setPlaceholder(`${storeName} の ${featureLabel}パネル設置チャンネルを選択`)
      .addChannelTypes(ChannelType.GuildText);

    const row = new ActionRowBuilder().addComponents(chSelect);

    await interaction.update({
      content: `📢 ${storeName} の ${featureLabel}パネルを設置するテキストチャンネルを選択してください：`,
      components: [row],
    });
  }

  // ---------- チャンネル選択後 → パネル送信 + config保存 ----------
  async function handleChannelSelectForPanel(interaction) {
    await interaction.deferUpdate();

    const guildId = interaction.guildId;
    const guild = interaction.guild;
    const storeName = interaction.customId.split(':').pop(); // 最後が storeName
    const channelId = interaction.values[0];
    const channel = guild.channels.cache.get(channelId);

    const config = await loadFeatureConfig(guildId);
    config.panels = config.panels || {};
    config.panels[storeName] = config.panels[storeName] || {};
    config.panels[storeName].channelId = channelId;

    // 店舗別 ②パネル送信（機能専用関数に委譲）
    const panelMessage = await postStorePanel({
      guild,
      channel,
      storeName,
      featureKey,
      featureLabel,
    });

    config.panels[storeName].messageId = panelMessage.id;
    config.panels[storeName].messageUrl = panelMessage.url;

    await saveFeatureConfig(guildId, config);

    // 設定パネル更新
    const settingPanel = await buildFeatureSettingPanel({
      guild,
      featureKey,
      featureLabel,
      loadFeatureConfig,
    });
    await interaction.message.edit(settingPanel);

    // 設定ログ出力
    const globalConfig = await getGuildConfig(guildId);
    const logThreadId = globalConfig.settingLogThread;
    if (logThreadId) {
      const logThread = await guild.channels.fetch(logThreadId).catch(() => null);
      if (logThread && logThread.isTextBased()) {
        const logEmbed = new EmbedBuilder()
          .setColor('#3498db')
          .setTitle(`⚙️ ${featureLabel}設定変更`)
          .setDescription(`${featureLabel}パネルが設置されました。`)
          .addFields(
            { name: '店舗', value: storeName, inline: true },
            { name: '設置チャンネル', value: `<#${channelId}>`, inline: true },
            {
              name: 'パネルメッセージ',
              value: `[リンク](${panelMessage.url})`,
              inline: false,
            },
            { name: '実行者', value: `<@${interaction.user.id}>` },
            { name: '実行時間', value: dayjs().format('YYYY/MM/DD HH:mm') },
          );
        await logThread.send({ embeds: [logEmbed] });
      }
    }

    await interaction.followUp({
      content: `✅ ${storeName} の ${featureLabel}パネルを <#${channelId}> に設置しました。`,
      flags: MessageFlags.Ephemeral,
    });
  }

  // ---------- 外部から呼ぶエントリ ----------
  async function handleInteraction(interaction) {
    if (!interaction.isButton() && !interaction.isAnySelectMenu()) return false;

    const { customId } = interaction;

    // ボタン
    if (interaction.isButton()) {
      if (customId === IDS.BTN_CONFIG_PANEL_SETUP()) {
        await openPanelSetupStoreSelect(interaction);
        return true;
      }
      if (customId === IDS.BTN_CONFIG_ROLE_APPROVER()) {
        await openRoleSelect(interaction, 'approver');
        return true;
      }
      if (customId === IDS.BTN_CONFIG_ROLE_VIEWER()) {
        await openRoleSelect(interaction, 'viewer');
        return true;
      }
      if (customId === IDS.BTN_CONFIG_ROLE_APPLICANT()) {
        await openRoleSelect(interaction, 'applicant');
        return true;
      }
      // CSV発行ボタンは別ハンドラに委譲（後で差し込み）
    }

    // セレクト
    if (interaction.isAnySelectMenu()) {
      if (customId === IDS.SELECT_CONFIG_STORE()) {
        await handleStoreSelectForPanel(interaction);
        return true;
      }
      if (customId.startsWith(`${featureKey}:config:select:channel:`)) {
        await handleChannelSelectForPanel(interaction);
        return true;
      }
      if (customId.startsWith(`${featureKey}:config:select:role:`)) {
        await handleRoleSelectSubmit(interaction);
        return true;
      }
    }

    return false;
  }

  return { handleInteraction };
}

module.exports = { createFeatureSettingHandler };
