/**
 * src/handlers/uriageBotHandler.js
 * 売上関連のインタラクションを処理する
 */
const logger = require('../utils/logger');
const {
  StringSelectMenuBuilder,
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
  MessageFlags,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  RoleSelectMenuBuilder,
} = require('discord.js');
const { getStoreList } = require('../utils/config/configAccessor');
const { getUriageConfig, saveUriageConfig } = require('./uriage/uriageConfigManager');
const dayjs = require('dayjs');
const { postUriagePanel } = require('./uriage/uriagePanel');
const { sendSettingLog } = require('./config/configLogger');

/**
 * 売上関連のインタラクションを統括して処理する
 * @param {import('discord.js').Interaction} interaction
 */
async function handleInteraction(interaction) {
  try {
    if (interaction.isButton()) {
      await handleButtonInteraction(interaction);
    } else if (interaction.isStringSelectMenu()) {
      await handleStringSelectMenuInteraction(interaction);
    } else if (interaction.isChannelSelectMenu()) {
      await handleChannelSelectMenuInteraction(interaction);
    } else if (interaction.isRoleSelectMenu()) {
      await handleRoleSelectMenuInteraction(interaction);
    } else if (interaction.isModalSubmit()) {
      await handleModalSubmitInteraction(interaction);
    }
  } catch (error) {
    logger.error(`[uriageBotHandler] Error handling interaction ${interaction.customId}:`, error);
    if (interaction.isRepliable()) {
      const replyOptions = { content: '⚠️ 売上設定処理中にエラーが発生しました。', flags: MessageFlags.Ephemeral };
      if (interaction.replied || interaction.deferred) await interaction.followUp(replyOptions).catch(() => {});
      else await interaction.reply(replyOptions).catch(() => {});
    }
  }
}

/**
 * ボタンインタラクションを処理
 * @param {import('discord.js').ButtonInteraction} interaction
 */
async function handleButtonInteraction(interaction) {
  const { customId, guild } = interaction;
  logger.info(`[uriageBotHandler] Button: ${customId}`);

  // --- 売上報告パネル設置 ---
  if (customId === 'uriage_panel_setup') {
    const stores = await getStoreList(guild.id);
        if (!stores || stores.length === 0) {
          return interaction.reply({
            content: '⚠️ 設定されている店舗がありません。まず `/設定` コマンドで店舗を登録してください。',
            flags: MessageFlags.Ephemeral,
          });
        }

    const storeOptions = stores.map(store => ({ label: store, value: store }));
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('uriage_select_store_for_panel')
      .setPlaceholder('パネルを設置する店舗を選択')
      .addOptions(storeOptions);

    await interaction.reply({
      content: 'どの店舗の売上報告パネルを設置しますか？',
      components: [new ActionRowBuilder().addComponents(selectMenu)],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // --- 申請ロール・役職設定ボタン ---
  if (customId === 'uriage_set_request') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const roleSelect = new RoleSelectMenuBuilder()
      .setCustomId('uriage_select_role_request')
      .setPlaceholder('申請ロールを選択（複数選択可）')
      .setMinValues(0)
      .setMaxValues(25);
    await interaction.editReply({
      content: '売上申請を行えるロールを選択してください。',
      components: [new ActionRowBuilder().addComponents(roleSelect)],
    });
    return;
  }

  // --- 承認ロール・役職設定ボタン ---
  if (customId === 'uriage_set_approval') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const roleSelect = new RoleSelectMenuBuilder()
      .setCustomId('uriage_select_role_approval')
      .setPlaceholder('承認ロールを選択（複数選択可）')
      .setMinValues(0)
      .setMaxValues(25);
    await interaction.editReply({
      content: '売上承認を行えるロールを選択してください。',
      components: [new ActionRowBuilder().addComponents(roleSelect)],
    });
    return;
  }

  // --- 閲覧ロール・役職設定ボタン ---
  if (customId === 'uriage_set_view') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const roleSelect = new RoleSelectMenuBuilder()
      .setCustomId('uriage_select_role_view')
      .setPlaceholder('閲覧ロールを選択（複数選択可）')
      .setMinValues(0)
      .setMaxValues(25);
    await interaction.editReply({ content: '売上報告履歴を閲覧できるロールを選択してください。', components: [new ActionRowBuilder().addComponents(roleSelect)] });
    return;
  }

  // --- 売上報告ボタン ---
  if (customId.startsWith('uriage_report_')) {
    const storeName = customId.replace('uriage_report_', '');
    const modal = new ModalBuilder()
      .setCustomId(`uriage_report_modal_${storeName}`)
      .setTitle(`💰 ${storeName} 売上報告`);

    const dateInput = new TextInputBuilder().setCustomId('date').setLabel('日付 (YYYY/MM/DD)').setStyle('Short').setPlaceholder('例: 2025/11/10').setRequired(true);
    const totalSalesInput = new TextInputBuilder().setCustomId('total_sales').setLabel('総売上').setStyle('Short').setPlaceholder('例: 500000').setRequired(true);
    const cashInput = new TextInputBuilder().setCustomId('cash').setLabel('現金').setStyle('Short').setPlaceholder('例: 300000').setRequired(true);
    const cardInput = new TextInputBuilder().setCustomId('card').setLabel('カード').setStyle('Short').setPlaceholder('例: 200000').setRequired(true);
    const expensesInput = new TextInputBuilder().setCustomId('expenses').setLabel('諸経費').setStyle('Short').setPlaceholder('例: 50000').setRequired(true);

    modal.addComponents([new ActionRowBuilder().addComponents(dateInput), new ActionRowBuilder().addComponents(totalSalesInput), new ActionRowBuilder().addComponents(cashInput), new ActionRowBuilder().addComponents(cardInput), new ActionRowBuilder().addComponents(expensesInput)]);
    await interaction.showModal(modal);
    return;
  }
}

/**
 * 文字列選択メニューインタラクションを処理
 * @param {import('discord.js').StringSelectMenuInteraction} interaction
 */
async function handleStringSelectMenuInteraction(interaction) {
  const { customId } = interaction;

  // --- 店舗選択後 → チャンネル選択へ ---
  if (customId === 'uriage_select_store_for_panel') {
    const storeName = interaction.values[0];
    const channelSelect = new ChannelSelectMenuBuilder()
      .setCustomId(`uriage_select_channel_for_panel_${storeName}`)
      .setPlaceholder('設置先のチャンネルを選択')
      .addChannelTypes(ChannelType.GuildText);

    await interaction.update({
      content: `**${storeName}** のパネルをどのチャンネルに設置しますか？`,
      components: [new ActionRowBuilder().addComponents(channelSelect)],
    });
  }
}

/**
 * チャンネル選択メニューインタラクションを処理
 * @param {import('discord.js').ChannelSelectMenuInteraction} interaction
 */
async function handleChannelSelectMenuInteraction(interaction) {
  const { customId, guild, user } = interaction;

  // --- チャンネル選択後 → パネル設置 ---
  if (customId.startsWith('uriage_select_channel_for_panel_')) {
    await interaction.deferUpdate();
    const storeName = customId.replace('uriage_select_channel_for_panel_', '');
    const channelId = interaction.values[0];
    const channel = await guild.channels.fetch(channelId);

    // 売上報告パネルを送信
    const panelEmbed = new EmbedBuilder().setTitle(`💰 売上報告パネル（${storeName}）`).setDescription('売上を報告する場合は、下のボタンを押してください。').setColor(0x5865f2);
    const panelRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`uriage_report_${storeName}`).setLabel('売上報告').setStyle(ButtonStyle.Primary));
    await channel.send({ embeds: [panelEmbed], components: [panelRow] });

    // 設定を保存
    const config = await getUriageConfig(guild.id);
    config.uriageChannels = config.uriageChannels || {};
    config.uriageChannels[storeName] = channelId;
    await saveUriageConfig(guild.id, config);

    // 設定パネルを更新
    await postUriagePanel(interaction.channel);

    // ログ送信
    await sendSettingLog(guild, { user, type: '売上設定', message: `**${storeName}** の売上報告パネルを <#${channelId}> に設置しました。` });

    await interaction.editReply({ content: `✅ **${storeName}** の売上報告パネルを <#${channelId}> に設置しました。`, components: [] });
  }
}

/**
 * ロール選択メニューインタラクションを処理
 * @param {import('discord.js').RoleSelectMenuInteraction} interaction
 */
async function handleRoleSelectMenuInteraction(interaction) {
  const { customId, guild, user } = interaction;
  await interaction.deferUpdate();
  const selectedRoleIds = interaction.values;
  const config = await getUriageConfig(guild.id);
  let oldRoles = [], newRoles = [], logType = '', configKey = '';

  switch (customId) {
    case 'uriage_select_role_request':
      oldRoles = config.uriageRequestRoles || [];
      config.uriageRequestRoles = selectedRoleIds;
      logType = '申請ロール';
      configKey = 'uriageRequestRoles';
      break;
    case 'uriage_select_role_approval':
      oldRoles = config.uriageApprovalRoles || [];
      config.uriageApprovalRoles = selectedRoleIds;
      logType = '承認ロール';
      configKey = 'uriageApprovalRoles';
      break;
    case 'uriage_select_role_view':
      oldRoles = config.uriageViewRoles || [];
      config.uriageViewRoles = selectedRoleIds;
      logType = '閲覧ロール';
      configKey = 'uriageViewRoles';
      break;
    default: return;
  }

  await saveUriageConfig(guild.id, config);
  newRoles = config[configKey];

  // パネルを更新
  await postUriagePanel(interaction.channel);

  // ログを送信
  const oldRoleMentions = oldRoles.length > 0 ? oldRoles.map(id => `<@&${id}>`).join(', ') : 'なし';
  const newRoleMentions = newRoles.length > 0 ? newRoles.map(id => `<@&${id}>`).join(', ') : 'なし';

  const logEmbed = new EmbedBuilder().setTitle(`💰 売上 ${logType}設定変更`).setDescription(`売上設定パネルの${logType}が変更されました。`).setColor(0xf1c40f)
    .addFields({ name: '変更前', value: oldRoleMentions.slice(0, 1020) }, { name: '変更後', value: newRoleMentions.slice(0, 1020) });

  await sendSettingLog(guild, { user, type: `売上${logType}設定`, embed: logEmbed, message: `売上${logType}が変更されました。` });

  await interaction.editReply({ content: `✅ 売上${logType}を設定しました。`, components: [] });
}

/**
 * モーダル送信インタラクションを処理
 * @param {import('discord.js').ModalSubmitInteraction} interaction
 */
async function handleModalSubmitInteraction(interaction) {
  const { customId, guild, user } = interaction;
  logger.info(`[uriageBotHandler] Modal: ${customId}`);

  // --- 売上報告モーダル送信 ---
  if (customId.startsWith('uriage_report_modal_')) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const storeName = customId.replace('uriage_report_modal_', '');

    // モーダルから値を取得
    const date = interaction.fields.getTextInputValue('date');
    const totalSales = parseInt(interaction.fields.getTextInputValue('total_sales').replace(/,/g, ''), 10);
    const cash = parseInt(interaction.fields.getTextInputValue('cash').replace(/,/g, ''), 10);
    const card = parseInt(interaction.fields.getTextInputValue('card').replace(/,/g, ''), 10);
    const expenses = parseInt(interaction.fields.getTextInputValue('expenses').replace(/,/g, ''), 10);

        // バリデーション
        if (!dayjs(date, 'YYYY/MM/DD', true).isValid()) {
          return interaction.editReply({ content: '⚠️ 日付の形式が正しくありません。「YYYY/MM/DD」の形式で入力してください。' });
        }
        if (isNaN(totalSales) || isNaN(cash) || isNaN(card) || isNaN(expenses)) {
          return interaction.editReply({ content: '⚠️ 金額には半角数字を入力してください。' });
        }

        // 残金を計算
        const balance = totalSales - (card + expenses);

    // スレッドを探すか作成
    const thread = await findOrCreateReportThread(interaction.channel, storeName, date);

    // スレッドに投稿するEmbedを作成
    const reportEmbed = new EmbedBuilder().setTitle(`売上報告 - ${date}`).setColor(0x3498db)
      .addFields(
        { name: '総売上', value: `${totalSales.toLocaleString()}円`, inline: true },
        { name: '現金', value: `${cash.toLocaleString()}円`, inline: true },
        { name: 'カード', value: `${card.toLocaleString()}円`, inline: true },
        { name: '諸経費', value: `${expenses.toLocaleString()}円`, inline: true },
        { name: '残金', value: `**${balance.toLocaleString()}円**`, inline: true },
        { name: '入力者', value: `<@${user.id}>`, inline: false },
        { name: '入力時間', value: dayjs().format('YYYY/MM/DD HH:mm'), inline: true }
      ).setFooter({ text: `店舗: ${storeName}` });

    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`uriage_approve_${thread.id}`).setLabel('承認').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`uriage_modify_${thread.id}`).setLabel('修正').setStyle(ButtonStyle.Secondary)
    );

    await thread.send({ embeds: [reportEmbed], components: [actionRow] });

    // 元チャンネルにログを投稿
    const summaryEmbed = new EmbedBuilder().setDescription(`**${date}** の売上報告が <@${user.id}> によって作成されました。\n詳細はスレッド <#${thread.id}> を確認してください。`).setColor(0x2ecc71);
    await interaction.channel.send({ embeds: [summaryEmbed] });

    await interaction.editReply({ content: '✅ 売上報告をスレッドに投稿しました。' });
  }
}

/**
 * 指定された年月のレポート用スレッドを検索または作成する
 * @param {import('discord.js').TextChannel} channel
 * @param {string} storeName
 * @param {string} dateString (YYYY/MM/DD)
 * @returns {Promise<import('discord.js').ThreadChannel>}
 */
async function findOrCreateReportThread(channel, storeName, dateString) {
  const threadName = `${dayjs(dateString).format('YYYY年MM月')}-${storeName}-売上報告`;

  // まずアクティブなスreadを検索
  let thread = channel.threads.cache.find(t => t.name === threadName && !t.archived);
  if (thread) return thread;

  // 見つからなければアーカイブされたスレッドを検索
  try {
    const archivedThreads = await channel.threads.fetchArchived();
    thread = archivedThreads.threads.find(t => t.name === threadName);
    if (thread) {
      await thread.setArchived(false);
      return thread;
    }
  } catch (err) {
    logger.warn(`[uriageBotHandler] Archived threads could not be fetched for channel ${channel.id}:`, err.message);
  }

  // それでも見つからなければ新規作成
  return await channel.threads.create({
    name: threadName,
    autoArchiveDuration: 10080, // 7 days
    reason: `${storeName} の ${dayjs(dateString).format('YYYY年MM月')} の売上報告スレッド`,
  });
}

module.exports = { handleInteraction };