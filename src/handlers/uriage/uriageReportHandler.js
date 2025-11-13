// src/handlers/uriage/uriageReportHandler.js
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

const { getUriageConfig, saveUriageCsv, getUriagePanelList } = require('../../utils/uriage/gcsUriageManager');
const { sendSettingLog } = require('../../utils/uriage/embedLogger');
const { getLogTargets } = require('../../utils/config/configAccessor');
const { IDS } = require('./ids');

// ------------------------------------------------------------
// 🔹 売上報告モーダルを開く
// ------------------------------------------------------------
async function openUriageReportModal(interaction) {
  // determine store identifier from the button customId (format: uriage:report:open:STORE)
  const rawId = interaction.customId || '';
  const parts = rawId.includes(':') ? rawId.split(':') : rawId.split('_');
  let store = parts[parts.length - 1];
  // if no store was encoded (legacy button like 'uriage:report:open'), avoid treating 'open' as store
  if (!store || store === 'open' || store === 'report' || store === 'uriage') {
    // try to infer store from panelList mapping by channel
    try {
      const guildId = interaction.guild.id;
      const panelList = await getUriagePanelList(guildId);
      const panel = panelList.find(p => p.channel === interaction.channel.id || p.channel === interaction.channel?.id);
      if (panel && panel.store) store = panel.store;
    } catch (e) {
      // ignore and fallback to channel name parsing
    }
  }

  // If still not found, try to inspect messages in this channel for a panel embed that includes the store name
  if (!store) {
    try {
      const msgs = await interaction.channel.messages.fetch({ limit: 50 }).catch(() => null);
      const found = msgs && msgs.find(m => m.embeds?.[0]?.title && m.embeds[0].title.includes('売上報告パネル'));
      if (found) {
        const title = found.embeds[0].title || '';
        const m = title.match(/\(([^)]+)\)$/);
        if (m && m[1]) store = m[1];
      }
    } catch (e) {
      // ignore
    }
  }
  const modal = new ModalBuilder()
    .setCustomId(`${IDS.MODAL_REPORT}:${store}`)
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
  // 仕様に合わせて: 「年月-店舗名-売上報告」
  const threadName = `${date.slice(0, 7)}-${storeName}-売上報告`;

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

  // 権限チェック（入力者 OR 承認者 OR 管理者）
  const embedForCheck = EmbedBuilder.from(interaction.message.embeds[0]);
  const inputUserField = embedForCheck.data?.fields?.find((f) => f.name === '入力者')?.value || '';
  const isInputUser = inputUserField?.includes(member.id);
  const isApprover = config.approverRoles?.some((r) => member.roles.cache.has(r));
  const isAdmin = member.permissions.has(PermissionsBitField.Flags.Administrator);
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
    await sendSettingLog(guildId, {
      title: '売上報告が削除されました',
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
      // store はファイル名のルールに倣って決定（thread の親チャンネル名などから判断するのが難しいため、
      // 通常は interaction.channel.parent の名前ではなく、スレッド名から店舗名を抽出する）
      const threadNameSegments = interaction.channel.name.split('-');
      const storeName = threadNameSegments.slice(1, -1).join('-') || '店舗未指定';
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
  // 売上報告スレッドを作成
  const parentChannel = interaction.channel;
  // store is encoded in the modal customId as the last segment
  const rawId = interaction.customId || '';
  const parts = rawId.includes(':') ? rawId.split(':') : rawId.split('_');
  let storeName = parts[parts.length - 1];
  if (!storeName || storeName === 'open' || storeName === 'report' || storeName === 'uriage') {
    // try to infer from panelList
    try {
      const guildId = interaction.guild.id;
      const panelList = await getUriagePanelList(guildId);
      const panel = panelList.find(p => p.channel === parentChannel.id);
      if (panel && panel.store) storeName = panel.store;
    } catch (e) {
      // ignore
    }
  }
  // fallback: derive from channel name if still unknown
  if (!storeName) {
    // try to find panel embed in the channel messages
    try {
      const msgs = await parentChannel.messages.fetch({ limit: 50 }).catch(() => null);
      const found = msgs && msgs.find(m => m.embeds?.[0]?.title && m.embeds[0].title.includes('売上報告パネル'));
      if (found) {
        const title = found.embeds[0].title || '';
        const m = title.match(/\(([^)]+)\)$/);
        if (m && m[1]) storeName = m[1];
      }
    } catch (e) {
      // ignore
    }
  }
  if (!storeName) storeName = parentChannel.name.replace('売上報告パネル', '').trim();
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
  await sendSettingLog(guildId, {
    title: '売上報告',
    fields: [{ name: '店舗', value: storeName, inline: true }, { name: '日付', value: inputs.date, inline: true }, { name: '入力者', value: `<@${member.id}>`, inline: true }, { name: 'スレッド', value: reportMsg.url, inline: false }],
  });

  // 管理者ログ（グローバル設定 adminLogChannel）にも出力する
  try {
    const targets = await getLogTargets(guildId);
    const adminChId = targets?.admin;
    if (adminChId) {
      let resolvedClient = global.client;
      if (!resolvedClient) {
        try { resolvedClient = require('../../botClient'); } catch { resolvedClient = null; }
      }
      if (resolvedClient) {
        try {
          const ch = await resolvedClient.channels.fetch(adminChId).catch(() => null);
          if (ch) {
            const adminEmbed = new EmbedBuilder()
              .setTitle('📣 売上報告がされました')
              .addFields(
                { name: '店舗', value: storeName, inline: true },
                { name: '日付', value: inputs.date, inline: true },
                { name: '入力者', value: `<@${member.id}>`, inline: true },
                { name: '入力時間', value: reportMsg.createdAt ? reportMsg.createdAt.toLocaleString('ja-JP') : new Date().toLocaleString('ja-JP'), inline: false },
                { name: 'スレッド', value: reportMsg.url, inline: false }
              )
              .setTimestamp();
            await ch.send({ embeds: [adminEmbed] }).catch(() => null);
          } else {
            console.warn('[uriage] 管理者ログ送信先が取得できませんでした:', adminChId);
          }
        } catch (e) {
          console.warn('[uriage] 管理者ログ送信でエラー:', e?.message || e);
        }
      }
    }
  } catch (e) {
    console.warn('[uriage] 管理者ログ取得エラー:', e?.message || e);
  }

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
  const isApprover = config.approverRoles?.some((r) =>
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
  // スレッド名は `YYYY/MM-店舗名-売上報告` の形式に変更済み
  const segments = interaction.channel.name.split('-');
  const storeName = segments.slice(1, -1).join('-') || '店舗未指定';
  const date = embed.data?.fields?.find(f => f.name === '日付')?.value || '';
  await saveUriageCsv(guildId, storeName, (date || '').replace(/\//g, ''), data);

  // 親チャンネルに承認ログを出す（スレッドの親チャンネル）
  try {
    const thread = interaction.channel;
    const parent = thread?.parent;
    if (parent) {
      // まず親チャンネル内の既存通知メッセージを検索して、見つかれば上書きする
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
          // 見つからなければ従来どおり新規メッセージを送信
          await parent.send({
            content: `✅ **${storeName}** の売上報告が承認されました。\n日付：${date}\n承認者：<@${member.id}>\nスレッドメッセージ：${interaction.message.url}`,
          }).catch(() => null);
        }
      } catch (err) {
        // メッセージ取得に失敗したら新規送信へフォールバック
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
  const approver = embed.data.fields.find((f) => f.name === '承認者')?.value;

  const canEdit =
    inputUser?.includes(member.id) ||
    approver?.includes(member.id) ||
    member.permissions.has(PermissionsBitField.Flags.Administrator);

  if (!canEdit) {
    return interaction.reply({ content: '⚠️ 修正権限がありません。', flags: MessageFlags.Ephemeral });
  }

  // openOnly指定時はモーダルを開くだけ
  if (opts.openOnly) {
    const modal = new ModalBuilder()
      .setCustomId(IDS.MODAL_FIX)
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
  if (interaction.customId === IDS.MODAL_FIX) {
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
      const threadNameSegments = interaction.channel.name.split('-');
      const storeName = threadNameSegments.slice(1, -1).join('-') || '店舗未指定';
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
      ...(config.approverRoles || []),
      ...(config.viewerRoles || []),
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

/**
 * 店舗別の売上報告パネルを設置するフローを開始する（未実装）
 * @param {import('discord.js').Interaction} interaction
 */
async function postStoreReportPanel(interaction) {
  // `uriagePanel_Report.postUriageReportPanel` を呼び出して、
  // 店舗選択→チャンネル選択→パネル設置 のフローを開始します。
  const { postUriageReportPanel } = require('./uriagePanel_Report');
  try {
    return await postUriageReportPanel(interaction, { step: 'select' });
  } catch (err) {
    console.error('[postStoreReportPanel] 店舗別パネル設置フローの開始に失敗:', err);
  return interaction.followUp({ content: '⚠️ 店舗別売上報告パネルの設置に失敗しました。ログを確認してください。', flags: MessageFlags.Ephemeral });
  }
}

module.exports = {
  openUriageReportModal,
  handleReportSubmit,
  handleApprove,
  handleReportFixSubmit,
  postStoreReportPanel, // エクスポートに追加
  handleDelete,
};