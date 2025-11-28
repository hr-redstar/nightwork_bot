// src/handlers/keihi/request/statusActions.js
// ----------------------------------------------------
// 経費申請のステータス操作
//   - 承認 / 修正 / 削除ボタン
//   - （修正モーダルはひとまず未実装のダミー）
// ----------------------------------------------------

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');

const { loadKeihiConfig } = require('../../../utils/keihi/keihiConfigManager'); // prettier-ignore
const { loadStoreRoleConfig } = require('../../../utils/config/storeRoleConfigManager');
const { sendSettingLog } = require('../../../utils/config/configLogger');
const { resolveStoreName } = require('../setting/panel');

// Helper to extract field value from embed
function getEmbedFieldValue(embed, fieldName) {
  const field = embed?.fields?.find((f) => f.name === fieldName);
  return field ? field.value : '不明';
}

// ボタン / モーダルのプレフィックス
const APPROVE_PREFIX = 'keihi_request_approve';
const MODIFY_PREFIX = 'keihi_request_modify';
const DELETE_PREFIX = 'keihi_request_delete';
const MODIFY_MODAL_PREFIX = 'keihi_request_modify_modal';

// ----------------------------------------------------
// 共通: 承認役職ID一覧を取得（/設定経費 の承認役職）
// ----------------------------------------------------
function collectApproverRoleIds(keihiConfig) {
  const set = new Set();

  if (Array.isArray(keihiConfig.approverRoleIds)) {
    for (const id of keihiConfig.approverRoleIds) {
      if (id) set.add(id);
    }
  }

  if (Array.isArray(keihiConfig.approvalRoles)) {
    for (const id of keihiConfig.approvalRoles) {
      if (id) set.add(id);
    }
  }

  return Array.from(set);
}

/**
 * 経費申請の操作権限をチェックする
 * @param {'approve' | 'modify' | 'delete'} action
 * @param {import('discord.js').GuildMember} member
 * @param {import('discord.js').Embed} embed
 * @param {string[]} approverRoleIds
 * @returns {{hasPermission: boolean, message: string | null}}
 */
function checkStatusActionPermission(action, member, embed, approverRoleIds) {
  const memberRoleIds = new Set(member.roles.cache.keys());
  const isApprover = approverRoleIds.some((id) => memberRoleIds.has(id));

  if (action === 'approve') {
    if (!isApprover) {
      return { hasPermission: false, message: 'この経費申請を承認する権限がありません。' };
    }
  } else { // modify, delete
    const originalInputUserMention = getEmbedFieldValue(embed, '入力者');
    const originalInputUserId = originalInputUserMention.match(/<@!?(\d+)>/)?.[1] || null;
    const isOriginalRequester = originalInputUserId === member.id;

    if (!isApprover && !isOriginalRequester) {
      return { hasPermission: false, message: 'この経費申請を操作する権限がありません。' };
    }
  }

  return { hasPermission: true, message: null };
}


// ----------------------------------------------------
// 共通: ステータスボタンの行を再構築
// ----------------------------------------------------
function buildStatusButtons(storeId, status) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${APPROVE_PREFIX}::${storeId}::${status}`)
      .setLabel('承認')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`${MODIFY_PREFIX}::${storeId}::${status}`)
      .setLabel('修正')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`${DELETE_PREFIX}::${storeId}::${status}`)
      .setLabel('削除')
      .setStyle(ButtonStyle.Danger),
  );
}

// ----------------------------------------------------
// 承認ボタン
// ----------------------------------------------------
/**
 * @param {import('discord.js').ButtonInteraction} interaction
 */
async function handleApproveButton(interaction) {
  const { customId, guild, member, message } = interaction;
  const guildId = guild.id;

  // customId: keihi_request_approve::店舗名::STATUS
  const parts = customId.split('::');
  const [prefix, storeId] = parts;

  if (prefix !== APPROVE_PREFIX || !storeId) {
    return;
  }

  await interaction.deferReply();

  const [keihiConfig, storeRoleConfig] = await Promise.all([
    loadKeihiConfig(guildId),
    loadStoreRoleConfig(guildId).catch(() => null),
  ]);

  const approverRoleIds = collectApproverRoleIds(keihiConfig);

  if (!approverRoleIds.length) {
    await interaction.editReply({
      content:
        '承認役職が設定されていないため、承認できません。\n先に `/設定経費` から承認役職を設定してください。',
    });
    return;
  }

  const baseEmbed = message.embeds?.[0];

  const { hasPermission, message: permError } = checkStatusActionPermission('approve', member, baseEmbed, approverRoleIds);
  if (!hasPermission) {
    await interaction.editReply({ content: permError });
    return;
  }

  if (!baseEmbed) {
    await interaction.editReply({
      content: '対象の経費申請メッセージが見つかりませんでした。',
    });
    return;
  }

  const storeName = resolveStoreName(storeRoleConfig, storeId);
  const now = new Date();
  const tsUnix = Math.floor(now.getTime() / 1000);
  const approvedAtText = `<t:${tsUnix}:f>`;

  // 既存フィールドをコピーしてステータス系だけ上書き
  const fields = Array.isArray(baseEmbed.fields)
    ? baseEmbed.fields.map((f) => ({ ...f }))
    : [];

  const upsertField = (name, value, inline = true) => {
    const found = fields.find((f) => f.name === name);

    if (found) {
      found.value = value;
      found.inline = inline;
    } else {
      fields.push({ name, value, inline });
    }
  };

  const originalDate = getEmbedFieldValue(baseEmbed, '日付');
  const originalDepartment = getEmbedFieldValue(baseEmbed, '部署');
  const originalItemName = getEmbedFieldValue(baseEmbed, '経費項目');
  const originalInputUser = getEmbedFieldValue(baseEmbed, '入力者');
  const originalInputTime = getEmbedFieldValue(baseEmbed, '入力時間');

  upsertField('ステータス', '✅ 承認済み', true);
  upsertField('承認者', `${member}`, true);
  upsertField('承認時間', approvedAtText, true);

  const newEmbed = EmbedBuilder.from(baseEmbed)
    .setTitle('経費申請 ✅ 承認されました')
    .setFields(fields)
    .setTimestamp(now);

  // メッセージ自体を更新（ボタン行はステータスだけ差し替え）
  const newButtonsRow = buildStatusButtons(storeId, 'APPROVED');

  await message.edit({
    embeds: [newEmbed],
    components: [newButtonsRow],
  });

  // 親テキストチャンネルのログメッセージを更新
  const thread = message.channel;
  const parentChannel =
    thread.isThread() && thread.parent ? thread.parent : thread;
  const footerText = baseEmbed.footer?.text || '';
  const logMessageId = footerText.startsWith('LogID: ')
    ? footerText.slice('LogID: '.length)
    : null;

  if (parentChannel && logMessageId) {
    const logMessage = await parentChannel.messages
      .fetch(logMessageId)
      .catch(() => null);
    if (logMessage) {
      let content = logMessage.content;

      // 「承認者：」行を書き換え（なければ追記）
      if (/^承認者：/m.test(content)) {
        content = content.replace(
          /^承認者：.*$/m,
          `承認者：${member}　承認時間：${approvedAtText}`,
        );
      } else {
        content = content.replace(
          /------------------------------\s*$/m,
          `承認者：${member}　承認時間：${approvedAtText}\n------------------------------`,
        );
      }

      await logMessage.edit({ content });
    }
  }

  // 管理ログにも出力
  await sendSettingLog(interaction, {
    title: '経費申請承認',
    description:
      `✅ 店舗「${storeName}」の経費申請を承認しました。\n` +
      `承認者：${member}\n` +
      `承認時間：${approvedAtText}\n` +
      `日付：${originalDate}　部署：${originalDepartment}　経費項目：${originalItemName}\n` +
      `入力者：${originalInputUser}　入力時間：${originalInputTime}\n` +
      `スレッドメッセージリンク：${message.url}`,
  });

  await interaction.editReply({
    content: '経費申請を承認しました。',
  });
}

// ----------------------------------------------------
// 修正ボタン
// ----------------------------------------------------
/**
 * @param {import('discord.js').ButtonInteraction} interaction
 */
async function handleModifyButton(interaction) {
  const { customId, guild, member, message } = interaction;
  const guildId = guild.id;

  const parts = customId.split('::');
  const [prefix, storeId] = parts;

  if (prefix !== MODIFY_PREFIX || !storeId) {
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const [keihiConfig, storeRoleConfig] = await Promise.all([
    loadKeihiConfig(guildId),
    loadStoreRoleConfig(guildId).catch(() => null),
  ]);

  const baseEmbed = message.embeds?.[0];
  if (!baseEmbed) {
    await interaction.editReply({
      content: '対象の経費申請メッセージが見つかりませんでした。',
    });
    return;
  }
  const approverRoleIds = collectApproverRoleIds(keihiConfig);
  const { hasPermission, message: permError } = checkStatusActionPermission('modify', member, baseEmbed, approverRoleIds);
  if (!hasPermission) {
    await interaction.editReply({ content: permError });
    return;
  }

  const storeName = resolveStoreName(storeRoleConfig, storeId);
  const now = new Date();
  const tsUnix = Math.floor(now.getTime() / 1000);
  const modifiedAtText = `<t:${tsUnix}:f>`;

  const originalDate = getEmbedFieldValue(baseEmbed, '日付');
  const originalDepartment = getEmbedFieldValue(baseEmbed, '部署');
  const originalItemName = getEmbedFieldValue(baseEmbed, '経費項目');

  // メッセージ更新（embed・ボタンはそのまま）
  await message.edit({
    content: `✏️ 経費申請　修正しました　修正者：${member}　修正時間：${modifiedAtText}`,
    embeds: message.embeds,
    components: message.components,
  });

  // 親チャンネルのログメッセージを更新（修正者行）
  const thread = message.channel;
  const parentChannel =
    thread.isThread() && thread.parent ? thread.parent : thread;
  const footerText = baseEmbed.footer?.text || '';
  const logMessageId = footerText.startsWith('LogID: ')
    ? footerText.slice('LogID: '.length)
    : null;

  if (parentChannel && logMessageId) {
    const logMessage = await parentChannel.messages
      .fetch(logMessageId)
      .catch(() => null);
    if (logMessage) {
      let content = logMessage.content;

      if (/^修正者：/m.test(content)) {
        content = content.replace(
          /^修正者：.*$/m,
          `修正者：${member}　修正時間：${modifiedAtText}`,
        );
      } else {
        content = content.replace(
          /承認者：.*$/m,
          `修正者：${member}　修正時間：${modifiedAtText}\n$&`,
        );
      }

      await logMessage.edit({ content });
    }
  }

  await sendSettingLog(interaction, {
    title: '経費申請修正',
    description:
      `✏️ 店舗「${storeName}」の経費申請を修正しました。\n` +
      `修正者：${member}　修正時間：${modifiedAtText}\n` +
      `日付：${originalDate}　部署：${originalDepartment}　経費項目：${originalItemName}\n` +
      `スレッドメッセージリンク：${message.url}`,
  });

  await interaction.editReply({
    content: '経費申請を「修正済み」としてマークしました。',
  });
}

// ----------------------------------------------------
// 削除ボタン
// ----------------------------------------------------
/**
 * @param {import('discord.js').ButtonInteraction} interaction
 */
async function handleDeleteButton(interaction) {
  const { customId, guild, member, message } = interaction;
  const guildId = guild.id;

  const parts = customId.split('::');
  const [prefix, storeId] = parts;

  if (prefix !== DELETE_PREFIX || !storeId) {
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const [keihiConfig, storeRoleConfig] = await Promise.all([
    loadKeihiConfig(guildId),
    loadStoreRoleConfig(guildId).catch(() => null),
  ]);

  // Permission check: 申請ユーザー + 承認ユーザー
  const baseEmbed = message.embeds?.[0];
  if (!baseEmbed) {
    await interaction.editReply({
      content: '対象の経費申請メッセージが見つかりませんでした。',
    });
    return;
  }
  // Permission check: 申請ユーザー + 承認ユーザー
  const originalInputUserMention = getEmbedFieldValue(baseEmbed, '入力者');
  const originalInputUserId =
    originalInputUserMention.match(/<@!?(\d+)>/)?.[1] || null;

  const approverRoleIds = collectApproverRoleIds(keihiConfig);
  const memberRoleIds = new Set(member.roles.cache.keys());
  const isApprover = approverRoleIds.some((id) => memberRoleIds.has(id));
  const isOriginalRequester = originalInputUserId === member.id;
  if (!isApprover && !isOriginalRequester) {
    await interaction.editReply({
      content: 'この経費申請を削除する権限がありません。',
    });
    return;
  }

  const storeName = resolveStoreName(storeRoleConfig, storeId);
  const now = new Date();
  const tsUnix = Math.floor(now.getTime() / 1000);
  const deletedAtText = `<t:${tsUnix}:f>`;

  const originalDate = getEmbedFieldValue(baseEmbed, '日付');
  const originalDepartment = getEmbedFieldValue(baseEmbed, '部署');
  const originalItemName = getEmbedFieldValue(baseEmbed, '経費項目');

  // メッセージ更新（ボタン削除）
  await message.edit({
    content: `❌ 経費申請　削除しました　削除者：${member}　削除時間：${deletedAtText}`,
    embeds: [baseEmbed],
    components: [],
  });

  // 親チャンネルのログメッセージを更新（末尾に削除ログっぽく追記）
  const thread = message.channel;
  const parentChannel =
    thread.isThread() && thread.parent ? thread.parent : thread;
  const footerText = baseEmbed.footer?.text || '';
  const logMessageId = footerText.startsWith('LogID: ')
    ? footerText.slice('LogID: '.length)
    : null;

  if (parentChannel && logMessageId) {
    const logMessage = await parentChannel.messages
      .fetch(logMessageId)
      .catch(() => null);
    if (logMessage) {
      const extra = [
        '×経費申請が削除されました。',
        `削除者：${member}　削除時間：${deletedAtText}`,
        `スレッドメッセージリンク：${message.url}`,
      ].join('\n');

      const newLogContent = `${logMessage.content}\n${extra}`;
      await logMessage.edit({ content: newLogContent });
    }
  }

  await sendSettingLog(interaction, {
    title: '経費申請削除',
    description:
      `❌ 店舗「${storeName}」の経費申請を削除しました。\n` +
      `削除者：${member}　削除時間：${deletedAtText}\n` +
      `日付：${originalDate}　部署：${originalDepartment}　経費項目：${originalItemName}\n` +
      `スレッドメッセージリンク：${message.url}`,
  });

  await interaction.editReply({
    content: '経費申請を削除しました。',
  });
}

// ----------------------------------------------------
// 修正モーダル送信（将来用のダミー）
// ----------------------------------------------------
/**
 * @param {import('discord.js').ModalSubmitInteraction} interaction
 */
async function handleModifyModalSubmit(interaction) {
  await interaction.reply({
    content: '経費申請の修正モーダル処理は現在準備中です。',
    flags: MessageFlags.Ephemeral,
  });
}

module.exports = {
  APPROVE_PREFIX,
  MODIFY_PREFIX,
  DELETE_PREFIX,
  MODIFY_MODAL_PREFIX,
  handleApproveButton,
  handleModifyButton,
  handleDeleteButton,
  handleModifyModalSubmit,
};