// src/handlers/keihi/request/requestFlow.js
// ----------------------------------------------------
// 経費「経費申請」フロー
//   - 経費申請ボタン押下 → 経費項目セレクト
//   - 経費項目セレクト → 経費申請モーダル
//   - モーダル送信 → スレッド作成 & チャンネルにログ出力
// ----------------------------------------------------

const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} = require('discord.js');

const {
  loadKeihiConfig,
  saveKeihiConfig,
} = require('../../../utils/keihi/keihiConfigManager');
const { loadStoreRoleConfig } = require('../../../utils/config/storeRoleConfigManager');
const {
  sendSettingLog,
  sendAdminLog,
} = require('../../../utils/config/configLogger');
const {
  resolveStoreName,
  sendKeihiPanel,
} = require('../setting/panel'); // sendKeihiPanel は使わなくなる
const { upsertStorePanelMessage } = require('./panel');
const {
  APPROVE_PREFIX,
  MODIFY_PREFIX,
  DELETE_PREFIX,
} = require('./statusActions');

// セレクト / モーダルの customId プレフィックス
const REQUEST_ITEM_SELECT_PREFIX = 'keihi_request_request_item';
const REQUEST_MODAL_PREFIX = 'keihi_request_request_modal';

// ----------------------------------------------------
// 共通: 経費申請ボタンを押してよいロールか判定
//   - 店舗の閲覧役職 or 申請役職 or グローバル承認役職
// ----------------------------------------------------
function collectAllowedRoleIdsForRequest(keihiConfig, storeId) {
  const panel = keihiConfig.panels?.[storeId] || {};

  const allowed = new Set();

  // 店舗ごとの閲覧役職 / 申請役職
  for (const id of panel.viewRoleIds || []) {
    if (id) allowed.add(id);
  }
  for (const id of panel.requestRoleIds || []) {
    if (id) allowed.add(id);
  }

  // グローバル承認役職（/設定経費 の承認役職）
  const approverSet = new Set();
  if (Array.isArray(keihiConfig.approverRoleIds)) {
    for (const id of keihiConfig.approverRoleIds) {
      if (id) {
        approverSet.add(id);
        allowed.add(id);
      }
    }
  }
  if (Array.isArray(keihiConfig.approvalRoles)) {
    for (const id of keihiConfig.approvalRoles) {
      if (id) {
        approverSet.add(id);
        allowed.add(id);
      }
    }
  }

  return {
    allowedRoleIds: Array.from(allowed),
    approverRoleIds: Array.from(approverSet),
  };
}

// ----------------------------------------------------
// 経費申請ボタン → 経費項目セレクト表示
// ----------------------------------------------------
/**
 * 経費申請ボタン押下時
 * @param {import('discord.js').ButtonInteraction} interaction
 * @param {string} storeId
 */
async function handleRequestStart(interaction, storeId) {
  const guild = interaction.guild;
  const guildId = guild.id;
  const member = interaction.member;

  const keihiConfig = await loadKeihiConfig(guildId);
  const panelConfig = keihiConfig.panels?.[storeId];

  if (!panelConfig || !panelConfig.channelId) {
    await interaction.reply({
      content: 'この店舗の経費申請パネル設定が見つかりません。',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const { allowedRoleIds } = collectAllowedRoleIdsForRequest(keihiConfig, storeId);

  // メンバーの所持ロール
  const memberRoleIds = new Set(member.roles.cache.keys());
  const hasPermission = allowedRoleIds.some((id) => memberRoleIds.has(id));

  if (!hasPermission) {
    await interaction.reply({
      content:
        'この店舗で経費申請を行う権限がありません。\nスレッド閲覧役職 / 申請役職 / 承認役職のいずれかを付与してください。',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const items = panelConfig.items || [];
  if (!items.length) {
    await interaction.reply({
      content:
        '経費項目が未設定です。先に「経費項目登録」から項目を登録してください。',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId(`${REQUEST_ITEM_SELECT_PREFIX}:${storeId}`)
    .setPlaceholder('申請する経費項目を選択')
    .setMinValues(1)
    .setMaxValues(1);

  items.forEach((item, index) => {
    let label;
    if (typeof item === 'string') {
      label = item;
    } else if (item && typeof item === 'object') {
      label = item.name || String(item);
    } else {
      label = String(item);
    }

    select.addOptions({
      label: label.slice(0, 100),
      value: String(index),
    });
  });

  const row = new ActionRowBuilder().addComponents(select);

  await interaction.reply({
    content: '経費項目を選択してください。',
    components: [row],
    flags: MessageFlags.Ephemeral,
  });
}

// ----------------------------------------------------
// 経費項目セレクト → 申請モーダル表示
// ----------------------------------------------------
/**
 * 経費項目セレクト送信時
 * @param {import('discord.js').StringSelectMenuInteraction} interaction
 */
async function handleRequestItemSelect(interaction) {
  const { customId, values, guild } = interaction;
  const guildId = guild.id;

  // customId: keihi_request_request_item:店舗名
  const [, storeId] = customId.split(':');

  const selectedIndex = Number(values[0] ?? 0);

  const keihiConfig = await loadKeihiConfig(guildId);
  const storeRoleConfig = await loadStoreRoleConfig(guildId).catch(() => null);

  const panelConfig = keihiConfig.panels?.[storeId];
  if (!panelConfig) {
    await interaction.reply({
      content: '経費申請パネルの設定が見つかりません。',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const items = panelConfig.items || [];
  const rawItem = items[selectedIndex];
  if (!rawItem) {
    await interaction.reply({
      content: '選択された経費項目が見つかりません。もう一度お試しください。',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  let itemLabel;
  if (typeof rawItem === 'string') {
    itemLabel = rawItem;
  } else if (rawItem && typeof rawItem === 'object') {
    itemLabel = rawItem.name || String(rawItem);
  } else {
    itemLabel = String(rawItem);
  }

  const storeName = resolveStoreName(storeRoleConfig, storeId);

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  const modal = new ModalBuilder()
    .setCustomId(`${REQUEST_MODAL_PREFIX}::${storeId}::${selectedIndex}`)
    .setTitle(`経費申請：${storeName}`);

  const dateInput = new TextInputBuilder()
    .setCustomId('date')
    .setLabel('日付（YYYY-MM-DD）')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setValue(todayStr);

  const deptInput = new TextInputBuilder()
    .setCustomId('department')
    .setLabel('部署')
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  const itemInput = new TextInputBuilder()
    .setCustomId('item')
    .setLabel('経費項目')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setValue(itemLabel.slice(0, 100));

  const amountInput = new TextInputBuilder()
    .setCustomId('amount')
    .setLabel('金額（半角数字）')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const noteInput = new TextInputBuilder()
    .setCustomId('note')
    .setLabel('備考')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder().addComponents(dateInput),
    new ActionRowBuilder().addComponents(deptInput),
    new ActionRowBuilder().addComponents(itemInput),
    new ActionRowBuilder().addComponents(amountInput),
    new ActionRowBuilder().addComponents(noteInput),
  );

  await interaction.showModal(modal);
}

// --- handleRequestModalSubmit のためのヘルパー関数群 ---

/**
 * 申請内容のバリデーションを行う
 * @param {import('discord.js').ModalSubmitInteraction} interaction
 * @returns {{error: string|null, data: object}}
 */
function validateAndGetData(interaction) {
  const dateStr = (interaction.fields.getTextInputValue('date') || '').trim();
  const department = (interaction.fields.getTextInputValue('department') || '').trim();
  const itemName = (interaction.fields.getTextInputValue('item') || '').trim();
  const amountStr = (interaction.fields.getTextInputValue('amount') || '').trim();
  const note = (interaction.fields.getTextInputValue('note') || '').trim();

  if (!dateStr) {
    return { error: '日付は必須です。', data: null };
  }

  const amount = Number(amountStr.replace(/[,，]/g, ''));
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: '金額は 0 より大きい半角数字で入力してください。', data: null };
  }

  return {
    error: null,
    data: { dateStr, department, itemName, amount, note },
  };
}

/**
 * 経費申請用のスレッドを検索または作成する
 * @param {import('discord.js').TextBasedChannel} channel
 * @param {string} dateStr
 * @param {string} storeName
 * @returns {Promise<import('discord.js').ThreadChannel>}
 */
async function findOrCreateExpenseThread(channel, dateStr, storeName) {
  let baseDate = new Date();
  const m = dateStr.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    if (!Number.isNaN(y) && !Number.isNaN(mo) && !Number.isNaN(d)) {
      baseDate = new Date(y, mo, d);
    }
  }
  const yyyy = baseDate.getFullYear();
  const mm = String(baseDate.getMonth() + 1).padStart(2, '0');
  const threadName = `${yyyy}-${mm}-${storeName}-経費申請`;

  let thread = channel.threads.cache.find((t) => t.name === threadName) || null;
  if (!thread) {
    const active = await channel.threads.fetchActive();
    thread = active.threads.find((t) => t.name === threadName) || null;
  }

  if (!thread) {
    thread = await channel.threads.create({
      name: threadName,
      autoArchiveDuration: 10080, // 7日
      type: ChannelType.PrivateThread,
      reason: `経費申請スレッド作成: ${storeName}`,
    });
  }
  return thread;
}

/**
 * スレッドに権限のあるメンバーを追加する
 * @param {import('discord.js').ThreadChannel} thread
 * @param {import('discord.js').Guild} guild
 * @param {import('discord.js').GuildMember} requester
 * @param {string[]} allowedRoleIds
 */
async function addMembersToThread(thread, guild, requester, allowedRoleIds) {
  try {
    if (allowedRoleIds.length) {
      const allMembers = await guild.members.fetch();
      for (const mbr of allMembers.values()) {
        const hasTargetRole = mbr.roles.cache.some((r) =>
          allowedRoleIds.includes(r.id),
        );
        if (!hasTargetRole) continue;
        if (thread.members.cache.has(mbr.id)) continue;
        await thread.members.add(mbr.id).catch(() => {});
      }
    }

    if (!thread.members.cache.has(requester.id)) {
      await thread.members.add(requester.id).catch(() => {});
    }
  } catch (e) {
    console.warn('スレッドへのメンバー追加中にエラーが発生しました:', e);
  }
}

/**
 * 経費申請パネルを更新し、必要であればconfigを保存する
 * @param {import('discord.js').Guild} guild
 * @param {string} storeId
 * @param {object} keihiConfig
 * @param {object} storeRoleConfig
 */
async function refreshPanelAndSave(guild, storeId, keihiConfig, storeRoleConfig) {
  const panelConfig = keihiConfig.panels?.[storeId];
  const updatedPanelMessage = await upsertStorePanelMessage(guild, storeId, keihiConfig, storeRoleConfig);

  if (updatedPanelMessage && updatedPanelMessage.id !== panelConfig.messageId) {
    const latestConfig = await loadKeihiConfig(guild.id);
    latestConfig.panels[storeId].messageId = updatedPanelMessage.id;
    await saveKeihiConfig(guild.id, latestConfig);
    console.log(`[requestFlow] パネルを再生成し、新しいメッセージID (${updatedPanelMessage.id}) を保存しました。`);
  }
}

/**
 * 経費申請モーダル送信時
 * @param {import('discord.js').ModalSubmitInteraction} interaction
 */
async function handleRequestModalSubmit(interaction) {
  const customId = interaction.customId; // keihi_request_request_modal::店舗名::index
  const [prefix, storeId] = customId.split('::');

  if (prefix !== REQUEST_MODAL_PREFIX || !storeId) {
    return; // 想定外
  }

  const guild = interaction.guild;
  const guildId = guild.id;
  const member = interaction.member;
  
  // ephemeral は非推奨になったため flags を使用
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try { // 1. バリデーションとデータ取得
    const { error, data } = validateAndGetData(interaction);
    if (error) {
      await interaction.editReply({ content: error });
      return;
    }
    const { dateStr, department, itemName, amount, note } = data;

    const [keihiConfig, storeRoleConfig] = await Promise.all([
      loadKeihiConfig(guildId),
      loadStoreRoleConfig(guildId).catch(() => null),
    ]);

    const panelConfig = keihiConfig.panels?.[storeId];
    if (!panelConfig || !panelConfig.channelId) {
      await interaction.editReply({
        content: '経費申請パネルの設定が見つかりません。',
      });
      return;
    }

    // 2. ログ出力先チャンネルとスレッドの準備
    const channel = await guild.channels.fetch(panelConfig.channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      await interaction.editReply({
        content: '経費申請ログ用のチャンネルに送信できません。',
      });
      return;
    }

    const storeName = resolveStoreName(storeRoleConfig, storeId);

    const thread = await findOrCreateExpenseThread(channel, dateStr, storeName);

    // 3. スレッドにメンバーを追加
    const { allowedRoleIds } = collectAllowedRoleIdsForRequest(
      keihiConfig,
      storeId,
    );
    await addMembersToThread(thread, guild, member, allowedRoleIds);

    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mi = String(now.getMinutes()).padStart(2, '0');
    const timestampText = `${dateStr || '不明'} ${hh}:${mi}`;
    const tsUnix = Math.floor(now.getTime() / 1000);

    // 4. スレッドに送信するメッセージを構築
    const content = '経費申請';
    const initialEmbed = new EmbedBuilder()
      .setTitle('経費申請')
      .addFields(
        { name: '日付', value: dateStr, inline: true },
        { name: '部署', value: department || '未入力', inline: true },
        { name: '経費項目', value: itemName || '未入力', inline: false },
        { name: '金額', value: `${amount.toLocaleString()} 円`, inline: true },
        { name: '備考', value: note || '未入力', inline: false },
        { name: 'ステータス', value: '🕒 申請中', inline: true },
        { name: '入力者', value: `${member}`, inline: true },
        { name: '入力時間', value: timestampText, inline: true },
      )
      .setTimestamp()
      .setFooter({ text: 'LogID: PENDING' }); // 仮のフッター

    // ステータス操作ボタン
    const buttonsRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`keihi_request_approve::${storeId}::PENDING`)
        .setLabel('承認')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`keihi_request_modify::${storeId}::PENDING`)
        .setLabel('修正')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`keihi_request_delete::${storeId}::PENDING`)
        .setLabel('削除')
        .setStyle(ButtonStyle.Danger),
    );

    // 5. スレッドにメッセージを送信
    console.log('プライベートスレッドへメッセージを送信中...');
    const threadMessage = await thread.send({
      content,
      embeds: [initialEmbed],
      components: [buttonsRow],
    });

    // 6. 申請チャンネルにログを送信
    console.log('経費申請パネルチャンネルへメッセージを送信中...');
    const logLines = [
      '------------------------------',
      `${dateStr || '不明日付'} の経費申請をしました。`,
      `入力者：${member}　入力時間：<t:${tsUnix}:f>`,
      '修正者：',
      '承認者：',
      `スレッドメッセージリンク：${threadMessage.url}`,
      '------------------------------',
    ];
    const logMessage = await channel.send({
      content: logLines.join('\n'),
    });

    // 7. スレッドメッセージを更新 (ログIDをフッターに)
    console.log('スレッドメッセージのフッターを更新中...');
    const finalEmbed = EmbedBuilder.from(initialEmbed).setFooter({
      text: `LogID: ${logMessage.id}`,
    });
    await threadMessage.edit({ embeds: [finalEmbed] });

    // 8. 管理者ログを送信
    try {
      console.log('管理者ログへメッセージを送信中...');
      await sendAdminLog(interaction, {
        title: '経費申請',
        description:
          `${storeName}で経費申請がされました。\n` +
          `日付：${dateStr}　部署：${department || '未入力'}　経費項目：${itemName}　備考：${note || '未入力'}　入力者：${member}　入力時間：${timestampText}\n` +
          `スレッドメッセージリンク：${threadMessage.url}`,
      });
      console.log('管理者ログへのメッセージ送信完了。');
    } catch (logError) {
      console.error('管理者ログの送信に失敗しました:', logError);
      await interaction.followUp({
        content:
          '⚠️ 管理者ログの送信に失敗しました。\n' +
          'ボットに管理者ログチャンネルへの「メッセージを送信」「埋め込みリンク」権限があるか確認してください。',
        flags: MessageFlags.Ephemeral,
      });
    }

    // 9. ユーザーへの最終応答
    await interaction.editReply({
      content: `店舗「${storeName}」で経費申請を登録しました。\nスレッド: ${threadMessage.url}`,
    });

    // 10. 経費申請パネルを再送信して最新化
    try {
      await refreshPanelAndSave(guild, storeId, keihiConfig, storeRoleConfig);
    } catch (e) {
      console.error('経費申請パネルの再送信中にエラーが発生しました:', e);
    }
  } catch (error) {
    console.error('経費申請モーダル処理中にエラーが発生しました:', error);
    await interaction.editReply({
      content: '経費申請の処理中にエラーが発生しました。コンソールログを確認してください。',
    }).catch(e => {
      console.error('エラー通知の送信に失敗しました:', e);
    });
  }
}

module.exports = {
  REQUEST_ITEM_SELECT_PREFIX,
  REQUEST_MODAL_PREFIX,
  handleRequestStart,
  handleRequestItemSelect,
  handleRequestModalSubmit,
};