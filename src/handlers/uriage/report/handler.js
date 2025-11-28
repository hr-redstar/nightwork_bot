// src/handlers/uriage/report/handler.js
// 売上報告・承認・修正・パネル設置のロジック

const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  MessageFlags,
} = require('discord.js');

const { loadUriageConfig } = require('../../../utils/uriage/uriageConfigManager');
const { saveUriageCsv } = require('../../../utils/uriage/uriageCsvManager'); // 仮
const { sendAdminLog, sendSettingLog } = require('../../../utils/uriage/embedLogger');
const { IDS } = require('../ids');

// ------------------------------------------------------------
// 🔹 売上報告モーダルを開く
// ------------------------------------------------------------
async function openUriageReportModal(interaction) {
  // ボタンの customId (uriage:report:open:STORE) から店舗IDを特定
  const rawId = interaction.customId || '';
  const storeId = rawId.split(':')[3]; // uriage:report:open:storeId

  if (!storeId) {
    return interaction.reply({ content: '⚠️ 店舗IDを特定できませんでした。', flags: MessageFlags.Ephemeral });
  }

  const modal = new ModalBuilder()
    .setCustomId(`${IDS.MODAL_REPORT}:${storeId}`) // uriage:report:modal:submit:storeId
    .setTitle('💰 売上報告');

  const inputDate = new TextInputBuilder()
    .setCustomId('date')
    .setLabel('日付（例：2025/11/13）')
    .setStyle(TextInputStyle.Short)
    .setValue(getToday())
    .setRequired(true);

  const inputTotal = new TextInputBuilder()
    .setCustomId('total')
    .setLabel('総売り（円）')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const inputCash = new TextInputBuilder()
    .setCustomId('cash')
    .setLabel('現金（円）')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const inputCard = new TextInputBuilder()
    .setCustomId('card')
    .setLabel('カード（円）')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const inputCost = new TextInputBuilder()
    .setCustomId('cost')
    .setLabel('諸経費（円）')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const rows = [inputDate, inputTotal, inputCash, inputCard, inputCost].map(
    (comp) => new ActionRowBuilder().addComponents(comp)
  );

  modal.addComponents(rows);
  await interaction.showModal(modal);
}

/**
 * モーダルから送信されたデータをパースする
 * @param {import('discord.js').ModalSubmitInteraction} interaction
 * @returns {{date: string, total: number, cash: number, card: number, cost: number, remain: number}}
 */
function parseReportInputs(interaction) {
  const inputs = {
    date: interaction.fields.getTextInputValue('date'),
    total: parseInt(interaction.fields.getTextInputValue('total') || 0, 10),
    cash: parseInt(interaction.fields.getTextInputValue('cash') || 0, 10),
    card: parseInt(interaction.fields.getTextInputValue('card') || 0, 10),
    cost: parseInt(interaction.fields.getTextInputValue('cost') || 0, 10),
  };
  inputs.remain = inputs.total - (inputs.card + inputs.cost);
  return inputs;
}

/**
 * 売上報告用のスレッドを検索または作成する
 * @param {import('discord.js').TextChannel} parentChannel
 * @param {string} storeName
 * @param {string} date
 * @returns {Promise<import('discord.js').ThreadChannel>}
 */
async function findOrCreateReportThread(parentChannel, storeName, date) {
  // 仕様に合わせて: 「YYYYMM-店舗名-売上報告」
  // 日付の先頭 7 文字 (YYYY/MM) を YYYYMM 形式に変換してスレッド名衝突を避ける
  const ym = (date || '').slice(0, 7).replace('/', ''); // e.g. '2025/11' -> '202511'
  const threadName = `${ym}-${storeName}-売上報告`;

  // 1. アクティブなスレッドを検索
  let thread = parentChannel.threads.cache.find(
    (t) => t.name === threadName && !t.archived
  );
  if (thread) return thread;

  // 2. アーカイブされたスレッドを検索
  try {
    const archivedThreads = await parentChannel.threads.fetchArchived();
    thread = archivedThreads.threads.find((t) => t.name === threadName);
    if (thread) {
      await thread.setArchived(false);
      return thread;
    }
  } catch (err) {
    console.warn(`[uriageReportHandler] アーカイブ済みスレッドの取得に失敗: ${err.message}`);
  }

  // 3. 見つからなければ新規作成
  return await parentChannel.threads.create({
    name: threadName,
    autoArchiveDuration: 4320, // 3日
    reason: '売上報告スレッド作成',
  });
}

/**
 * 売上報告のEmbedを作成する
 * @param {object} inputs - パース済みのモーダル入力
 * @param {string} storeName - 店舗名
 * @param {import('discord.js').GuildMember} member - 実行メンバー
 * @returns {EmbedBuilder}
 */
function buildReportEmbed(inputs, storeName, member, inputTime) {
  return new EmbedBuilder()
    .setTitle(`📊 ${storeName} 売上報告`)
    .addFields(
      { name: '日付', value: inputs.date, inline: true },
      { name: '総売り', value: `${inputs.total.toLocaleString()}円`, inline: true },
      { name: '現金', value: `${inputs.cash.toLocaleString()}円`, inline: true },
      { name: 'カード', value: `${inputs.card.toLocaleString()}円`, inline: true },
      { name: '諸経費', value: `${inputs.cost.toLocaleString()}円`, inline: true },
      { name: '残金', value: `${inputs.remain.toLocaleString()}円`, inline: true },
      { name: '入力者', value: `<@${member.id}>`, inline: true },
      { name: '入力時間', value: inputTime ? inputTime.toLocaleString('ja-JP') : new Date().toLocaleString('ja-JP'), inline: true }
    )
    .setColor(0x00bfa5)
    .setTimestamp();
}

/**
 * 売上報告スレッド内のアクションボタンを作成する
 * @returns {ActionRowBuilder}
 */
function buildReportActionRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(IDS.BTN_APPROVE)
      .setLabel('承認')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(IDS.BTN_FIX)
      .setLabel('修正')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(IDS.BTN_DELETE)
      .setLabel('削除')
      .setStyle(ButtonStyle.Danger)
  );
}

// ------------------------------------------------------------
// 🔹 削除ボタンハンドラ
// ------------------------------------------------------------
async function handleDelete(interaction) {
  const guildId = interaction.guild.id;
  const member = interaction.member;
  const config = await getUriageConfig(guildId);

  // 権限チェック（入力者 OR 承認ロール OR ManageGuild権限）
  const embedForCheck = EmbedBuilder.from(interaction.message.embeds[0]);
  const inputUserField = embedForCheck.data?.fields?.find((f) => f.name === '入力者')?.value || '';
  const isInputUser = inputUserField?.includes(member.id);
  const isApprover = config.approverRoleIds?.some((r) => member.roles.cache.has(r));
  const isAdmin = member.permissions.has(PermissionsBitField.Flags.ManageGuild);
  if (!isInputUser && !isApprover && !isAdmin) {
  return interaction.reply({ content: '⚠️ 削除権限がありません。', flags: MessageFlags.Ephemeral });
  }

  try {
    // メッセージの Embed を更新して「削除済み」と表示、コンポーネントを削除
    const embed = EmbedBuilder.from(interaction.message.embeds[0]);
    embed.setTitle((embed.data?.title || '') + ' (削除済み)');
    embed.setColor(0x808080);
    embed.addFields(
      { name: '削除者', value: `<@${member.id}>`, inline: true },
      { name: '削除日', value: new Date().toLocaleDateString('ja-JP'), inline: true }
    );

    await interaction.update({ embeds: [embed], components: [] });

    // 管理ログに出力
    await sendAdminLog(interaction, {
      title: '🗑️ 売上報告削除',
      fields: [
        { name: '操作者', value: `<@${member.id}>`, inline: true },
        { name: 'メッセージ', value: interaction.message.url || 'URLなし', inline: false },
      ],
    });
    // CSV に削除フラグを追加（履歴として残す）
    try {
      const embedForCsv = EmbedBuilder.from(interaction.message.embeds[0]);
      const date = embedForCsv.data?.fields?.find(f => f.name === '日付')?.value || '';
      const inputUser = embedForCsv.data?.fields?.find(f => f.name === '入力者')?.value || '';
      const csvData = {
        date,
        user: inputUser,
        approver: `<@${member.id}>`,
        total: 0,
        cash: 0,
        card: 0,
        cost: 0,
        remain: 0,
        createdAt: new Date().toLocaleString('ja-JP'),
      };
      // 埋め込みタイトルから店舗名を抽出する（例: '📊 店舗A 売上報告'）
      const embedTitle = embedForCsv.data?.title || '';
      const mStore = embedTitle.match(/📊\s*(.+?)\s*売上報告/);
      const storeName = (mStore && mStore[1]) ? mStore[1] : (interaction.channel.name.split('-').slice(1, -1).join('-') || '店舗未指定');
      await saveUriageCsv(guildId, storeName, (date || '').replace(/\//g, ''), csvData, 'deleted');
    } catch (e) {
      console.warn('[handleDelete] CSV への削除フラグ保存に失敗:', e.message);
    }
  } catch (err) {
    console.error('[handleDelete] 削除処理でエラー:', err);
    return interaction.reply({ content: '⚠️ 削除処理に失敗しました。', flags: MessageFlags.Ephemeral });
  }
}

// ------------------------------------------------------------
// 🔹 モーダル送信後：スレッド作成 & メッセージ出力
// ------------------------------------------------------------
async function handleReportSubmit(interaction) {
  const guildId = interaction.guild.id;
  const member = interaction.member;
  const inputs = parseReportInputs(interaction);
  const config = await getUriageConfig(guildId);
  const parentChannel = interaction.channel;

  // 店舗IDはモーダルの customId の最後のセグメントにエンコードされている
  const rawId = interaction.customId || '';
  const storeName = rawId.split(':')[3]; // 'uriage:report:modal:submit:STORE' -> STORE

  const thread = await findOrCreateReportThread(parentChannel, storeName, inputs.date);
  await applyThreadPermissions(thread, config);

  // Embedとボタンを生成（入力時間を保持）
  const inputTime = new Date();
  const embed = buildReportEmbed(inputs, storeName, member, inputTime);
  const row = buildReportActionRow();

  // スレッドにメッセージを送信
  const reportMsg = await thread.send({ embeds: [embed], components: [row] });

  // 親チャンネルに通知（入力時間・承認者を含める）
  await parentChannel.send({
    content: `📢 **${storeName}** の売上報告がされました。\n日付：${inputs.date}\n入力者：<@${member.id}>\n入力時間：${reportMsg.createdAt ? reportMsg.createdAt.toLocaleString('ja-JP') : inputTime.toLocaleString('ja-JP')}\n承認者：未承認\nスレッド：${reportMsg.url}`,
  });

  // 管理者ログに出力
  await sendAdminLog(interaction, {
    title: '📝 売上報告',
    fields: [{ name: '店舗', value: storeName, inline: true }, { name: '日付', value: inputs.date, inline: true }, { name: '入力者', value: `<@${member.id}>`, inline: true }, { name: 'スレッド', value: reportMsg.url, inline: false }],
  });

  await interaction.reply({ content: `✅ 売上報告を登録しました。`, flags: MessageFlags.Ephemeral });
}

// ------------------------------------------------------------
// 🔹 承認ボタン
// ------------------------------------------------------------
async function handleApprove(interaction) {
  const guildId = interaction.guild.id;
  const member = interaction.member;
  const config = await getUriageConfig(guildId);

  // 権限チェック
  const isApprover = config.approverRoleIds?.some((r) =>
    member.roles.cache.has(r)
  );
    if (!isApprover) {
    return interaction.reply({ content: '⚠️ 承認権限がありません。', flags: MessageFlags.Ephemeral });
  }

  // メッセージ更新
  const embed = EmbedBuilder.from(interaction.message.embeds[0]);
  embed.addFields(
    { name: '承認者', value: `<@${member.id}>`, inline: true },
    { name: '承認日', value: new Date().toLocaleDateString('ja-JP'), inline: true }
  );

  await interaction.update({ embeds: [embed], components: [] });

  // CSV保存
  const data = parseEmbedToCsvData(embed, member.id);
  // 埋め込みタイトルから店舗名を抽出する
  const title = embed.data?.title || '';
  const m = title.match(/📊\s*(.+?)\s*売上報告/);
  const storeName = (m && m[1]) ? m[1] : (interaction.channel.name.split('-').slice(1, -1).join('-') || '店舗未指定');
  const date = embed.data?.fields?.find(f => f.name === '日付')?.value || '';
  await saveUriageCsv(guildId, storeName, (date || '').replace(/\//g, ''), data);

  // 親チャンネルに承認ログを出す（スレッドの親チャンネル）
  try {
    const thread = interaction.channel;
    const parent = thread?.parent;
    if (parent) {
      // まず親チャンネル内の既存通知メッセージを検索し、見つかれば上書きする
      try {
        const msgs = await parent.messages.fetch({ limit: 50 });
        const target = msgs.find(m => m.content && m.content.includes(interaction.message.url));
        if (target) {
          // 既存メッセージの承認者欄を更新
          let newContent = target.content;
          if (/承認者：/.test(newContent)) {
            newContent = newContent.replace(/承認者：.*(?=\n|$)/, `承認者：<@${member.id}>`);
          } else {
            newContent += `\n承認者：<@${member.id}>`;
          }
          await target.edit({ content: newContent }).catch(() => null);
        } else {
          // 見つからなければ従来通り新規メッセージを送信
          await parent.send({
            content: `✅ **${storeName}** の売上報告が承認されました。\n日付：${date}\n承認者：<@${member.id}>\nスレッドメッセージ：${interaction.message.url}`,
          }).catch(() => null);
        }
      } catch (err) {
        // メッセージ取得に失敗したら新規送信へフォールバックする
        await parent.send({
          content: `✅ **${storeName}** の売上報告が承認されました。\n日付：${date}\n承認者：<@${member.id}>\nスレッドメッセージ：${interaction.message.url}`,
        }).catch(() => null);
      }
    }
  } catch (err) {
    console.warn('[handleApprove] 親チャンネルへの承認ログ送信に失敗:', err.message);
  }
}

// ------------------------------------------------------------
// 🔹 修正モーダル（入力者 or 承認者のみ）
// ------------------------------------------------------------
async function handleReportFixSubmit(interaction, opts = {}) {
  const member = interaction.member;
  const embed = EmbedBuilder.from(interaction.message.embeds[0]);
  const inputUser = embed.data.fields.find((f) => f.name === '入力者')?.value;

  const canEdit =
    inputUser?.includes(member.id) ||
    member.permissions.has(PermissionsBitField.Flags.ManageGuild);

  if (!canEdit) {
    return interaction.reply({ content: '⚠️ 修正権限がありません。', flags: MessageFlags.Ephemeral });
  }

  // openOnly指定時はモーダルを開くだけ
  if (opts.openOnly) {
    const modal = new ModalBuilder()
      .setCustomId(`${IDS.MODAL_FIX}:${interaction.message.id}`) // uriage:report:modal:fix:messageId
      .setTitle('✏️ 売上報告修正');

    const inputs = ['総売り', '現金', 'カード', '諸経費'].map((label, i) =>
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(label)
          .setLabel(label)
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );

    modal.addComponents(inputs);
    return interaction.showModal(modal);
  }

  // 修正送信時
  if (interaction.customId.startsWith(IDS.MODAL_FIX)) {
    const total = interaction.fields.getTextInputValue('総売り');
    const cash = interaction.fields.getTextInputValue('現金');
    const card = interaction.fields.getTextInputValue('カード');
    const cost = interaction.fields.getTextInputValue('諸経費');
    const remain = total - (card + cost);

    embed.addFields(
      { name: '修正日', value: new Date().toLocaleDateString('ja-JP'), inline: true },
      { name: '修正者', value: `<@${member.id}>`, inline: true },
      { name: '総売り(修正後)', value: `${total}`, inline: true },
      { name: '現金(修正後)', value: `${cash}`, inline: true },
      { name: 'カード(修正後)', value: `${card}`, inline: true },
      { name: '諸経費(修正後)', value: `${cost}`, inline: true },
      { name: '残金(再計算)', value: `${remain}`, inline: true }
    );

    await interaction.update({ embeds: [embed] });
    // CSV に修正履歴として追記（status=edited）
    try {
      const guildId = interaction.guild.id;
      // 日付と入力者を既存の埋め込みから取得
      const date = embed.data?.fields?.find(f => f.name === '日付')?.value || '';
      const inputUser = embed.data?.fields?.find(f => f.name === '入力者')?.value || '';
      const approver = embed.data?.fields?.find(f => f.name === '承認者')?.value || '';
      const csvData = {
        date,
        user: inputUser,
        approver: approver || '',
        total: parseInt(total || '0', 10) || 0,
        cash: parseInt(cash || '0', 10) || 0,
        card: parseInt(card || '0', 10) || 0,
        cost: parseInt(cost || '0', 10) || 0,
        remain: parseInt(remain || '0', 10) || 0,
        createdAt: new Date().toLocaleString('ja-JP'),
      };
  // 埋め込みタイトルから店舗名を抽出
      const title = embed.data?.title || '';
      const mStore = title.match(/📊\s*(.+?)\s*売上報告/);
      const storeName = (mStore && mStore[1]) ? mStore[1] : (interaction.channel.name.split('-').slice(1, -1).join('-') || '店舗未指定');
      await saveUriageCsv(guildId, storeName, (date || '').replace(/\//g, ''), csvData, 'edited');
    } catch (e) {
      console.warn('[handleReportFixSubmit] CSV への修正履歴保存に失敗:', e.message);
    }
  }
}

// ------------------------------------------------------------
// 🔹 権限制御（承認・閲覧ロールのみアクセス可）
// ------------------------------------------------------------
async function applyThreadPermissions(thread, config) {
  try {
    if (!thread?.permissionOverwrites) {
      console.warn('⚠️ スレッドまたは権限オブジェクトが見つかりません。権限設定をスキップします。');
      return;
    }

    const everyone = thread.guild.roles.everyone;
    await thread.permissionOverwrites.edit(everyone, { ViewChannel: false });

    const allowed = [
      ...(config.approverRoleIds || []),
      ...(config.viewerRoleIds || []),
    ];

    for (const roleId of allowed) {
      await thread.permissionOverwrites.edit(roleId, { ViewChannel: true });
    }
  } catch (err) {
    console.error('⚠️ スレッド権限設定エラー:', err);
  }
}

// ------------------------------------------------------------
// 🔹 日付ヘルパー
// ------------------------------------------------------------
function getToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}/${m}/${day}`;
}

/**
 * Embed から CSV 保存用のデータを抽出する
 * @param {EmbedBuilder} embed
 * @param {string} approverId
 * @returns {{date:string,user:string,approver:string,total:number,cash:number,card:number,cost:number,remain:number,createdAt:string}}
 */
function parseEmbedToCsvData(embed, approverId) {
  const fields = embed.data?.fields || embed.fields || [];
  const find = (name) => (fields.find(f => f.name === name) || {}).value || '';

  const date = find('日付');
  const total = parseInt((find('総売り') || '0').toString().replace(/[^0-9]/g, ''), 10) || 0;
  const cash = parseInt((find('現金') || '0').toString().replace(/[^0-9]/g, ''), 10) || 0;
  const card = parseInt((find('カード') || '0').toString().replace(/[^0-9]/g, ''), 10) || 0;
  const cost = parseInt((find('諸経費') || '0').toString().replace(/[^0-9]/g, ''), 10) || 0;
  const remain = parseInt((find('残金') || (total - (card + cost))).toString().replace(/[^0-9\-]/g, ''), 10) || (total - (card + cost));
  const inputUser = find('入力者') || '';

  return {
    date,
    user: inputUser,
    approver: approverId ? `<@${approverId}>` : '',
    total,
    cash,
    card,
    cost,
    remain,
    createdAt: new Date().toLocaleString('ja-JP'),
  };
}

module.exports = {
  openUriageReportModal,
  handleReportSubmit,
  handleApprove,
  handleReportFixSubmit,
  handleDelete,
};