// src/handlers/keihi/経費申請/keihiApproveHandler.js
const {
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');
const dayjs = require('dayjs');
const logger = require('../../../utils/logger'); // loggerをインポート
const { loadKeihiConfig, saveKeihiDaily, readKeihiDaily } = require('../../../utils/keihi/keihiConfigManager');
const { getGuildConfig, loadStoreRoleConfig } = require('../../../utils/config/storeRoleConfigManager');

/**
 * 修正・削除の権限があるかチェックする
 * @param {import('discord.js').Interaction} interaction - The interaction object.
 * @param {import('discord.js').Embed} embed - The embed from the message to check against.
 * @param {object} keihiConfig - The expense-specific config.
 * @param {object} globalConfig - The server's global config containing role links.
 * @returns {boolean} - True if authorized, false otherwise.
 */
function isAuthorized(interaction, embed, keihiConfig, storeRoleConfig) {
  const user = interaction.user;
  const authorId = embed.fields?.find(f => f.name === '👤 入力者')?.value?.replace(/[<@>]/g, '');
  const isAuthor = user.id === authorId;

  // 申請者である場合は常に許可する
  if (isAuthor) return true;

  // 承認権限があるかチェックする
  const hasPerm = hasApprovalPermission(interaction, keihiConfig, storeRoleConfig);

  return hasPerm;
}

/**
 * Embedからフィールドを抽出し、オブジェクトとして返す
 * @param {import('discord.js').Embed} embed
 */
function getEmbedFields(embed) {
  return Object.fromEntries(embed.fields.map(f => [f.name, f.value]));
}

/**
 * 承認権限を持つか確認
 */
function hasApprovalPermission(interaction, keihiConfig, storeRoleConfig) {
  const guildId = interaction.guildId;
  const member = interaction.member;

  // 2. 経費設定から承認に必要な役職名を取得
  if (!keihiConfig?.roles?.approval) {
    logger.warn(`[keihiApproveHandler] 経費設定ファイルまたは承認役職が未設定です (Guild: ${guildId})`);
    return false;
  }
  const approvalPositionName = keihiConfig.roles.approval;

  // 3. サーバー設定から役職とロールの紐付け情報を取得
  const roleLinkMap = storeRoleConfig?.link_role_role;
  if (!roleLinkMap) {
    // デバッグログを追加する
    logger.debug('[DEBUG keihiApproveHandler] roleLinkMap is missing.', {
      guildId,
      hasStoreRoleConfig: !!storeRoleConfig,
      hasRoleLinks: !!storeRoleConfig?.link_role_role,
      availableKeys: storeRoleConfig ? Object.keys(storeRoleConfig) : [],
    });
    logger.warn(`[keihiApproveHandler] 店舗・役職・ロール設定または紐づけが見つかりません (Guild: ${guildId})`);
    return false;
  }

  // 4. 役職名に対応するDiscordロールIDリストを取得する
  // デバッグログを追加する
  logger.debug('[DEBUG keihiApproveHandler]', {
    approvalRoleName: approvalPositionName,
    availableRoleKeys: Object.keys(roleLinkMap || {}),
  });
  const allowedRoleIds = roleLinkMap[approvalPositionName] || [];
  if (allowedRoleIds.length === 0) return false;

  // 5. メンバーが持っているロールと照合する
  return member.roles.cache.some(r => allowedRoleIds.includes(r.id));
}

/**
 * 経費申請チャンネルのログメッセージを更新する共通関数
 * @param {import('discord.js').Interaction} interaction
 * @param {object} fields - 元のEmbedから抽出したフィールド
 * @param {string} newStatusMessage - 追加するステータスメッセージ
 */
async function updateChannelLog(interaction, fields, newStatusMessage) {
  if (!interaction.channel.parent) return;

  const applicantId = fields['👤 入力者']?.replace(/[<@>]/g, '');
  const createdAt = fields['⏰ 入力時間'];
  const logIdentifier = `<!-- keihi-log:${applicantId}:${createdAt} -->`;

  const messages = await interaction.channel.parent.messages.fetch({ limit: 50 });
  const targetLogMessage = messages.find(m => m.content.includes(logIdentifier));

  if (targetLogMessage) {
    // 元のメッセージから識別子と区切り線を削除する
    const baseContent = targetLogMessage.content
      .replace(logIdentifier, '')
      .replace(/^-+\s*$/m, ''); // 区切り線を削除
    const newContent = `${baseContent.trim()}\n\n${newStatusMessage}\n---------------------------\n${logIdentifier}`;

    await targetLogMessage.edit({
      content: newContent,
    });
  }
}

/**
 * 経費申請 承認ボタン処理
 */
async function handleKeihiApprove(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const guildId = interaction.guild.id;
  const user = interaction.user;
  const [storeRoleConfig, keihiConfig] = await Promise.all([loadStoreRoleConfig(guildId), loadKeihiConfig(guildId)]);

  // 承認権限をチェックする
  if (!hasApprovalPermission(interaction, keihiConfig, storeRoleConfig)) {
    return interaction.editReply({
      content: '⚠️ 承認権限がありません。',
    });
  }

  const message = interaction.message;
  const embed = message.embeds[0];
  if (!embed) return interaction.editReply({ content: '⚠️ メッセージを読み取れませんでした。' });

  const fields = getEmbedFields(embed);
  const storeName = interaction.channel.name.split('-')[1] || '不明店舗';
  const now = dayjs().format('YYYY/MM/DD HH:mm');

  const approvedEmbed = EmbedBuilder.from(embed)
    .setColor('#2ecc71')
    .setTitle('🧾 経費申請 ✅承認されました')
    .addFields({
      name: '承認者',
      value: `<@${user.id}>`,
      inline: true,
    })
    .addFields({ name: '承認時間', value: now, inline: true }) // 承認時間
    .setTimestamp(new Date());

  // 承認済み表示に更新
  await message.edit({ embeds: [approvedEmbed], components: message.components });

  // 店舗チャンネルにログ出力
  const approvalLogMessage = `✅経費申請が承認されました。\n承認時間：${now}\n入力者：${fields['👤 入力者']}`;
  await updateChannelLog(interaction, fields, approvalLogMessage);

  // 管理ログ出力
  const globalConfig = await getGuildConfig(guildId);
  const logChannelId = globalConfig.adminLogChannel;
  if (logChannelId) {
    const logChannel = interaction.guild.channels.cache.get(logChannelId);
    if (logChannel) {
      await logChannel.send({
        embeds: [
          new EmbedBuilder()
            .setColor('#2ecc71') // 緑色
            .setTitle(`✅ ${storeName}の経費申請を承認しました`) // タイトル
            .setDescription(`承認者：<@${user.id}>　承認時間：${now}`) // 承認者と承認時間
            .addFields(
              { name: '📅 日付', value: fields['📅 日付'] || '—', inline: true },
              { name: '🏢 部署', value: fields['🏢 部署'] || '—', inline: true },
              { name: '📦 経費項目', value: fields['📦 経費項目'] || '—', inline: true },
              { name: '👤 入力者', value: fields['👤 入力者'] || '—', inline: true },
              { name: '⏰ 入力時間', value: fields['⏰ 入力時間'] || '—', inline: true },
            )
            .setURL(interaction.message.url)
            .setTimestamp(new Date()),
        ],
      });
    }
  }

  // ✅ データを保存する
  // 申請時のデータを更新する
  const date = fields['📅 日付'];
  const [y, m, d] = date.split('/');
  const dailyData = await readKeihiDaily(guildId, storeName, y, m, d);
  const applicantId = fields['👤 入力者']?.replace(/[<@>]/g, '');
  const createdAt = fields['⏰ 入力時間'];

  const targetIndex = dailyData.findIndex(
    entry => entry.applicant === applicantId && entry.createdAt === createdAt && entry.status === 'pending',
  );

  if (targetIndex !== -1) {
    dailyData[targetIndex].status = 'approved';
    dailyData[targetIndex].approver = user.id;
    dailyData[targetIndex].approvedAt = now;
    await saveKeihiDaily(guildId, storeName, dailyData, true); // 第4引数で上書きを指示する
  } else {
    logger.warn(`⚠️ 承認対象の経費データが見つかりませんでした。ギルドID: ${guildId}, 店舗: ${storeName}, 申請者: ${applicantId}, 申請時間: ${createdAt}`);
  }

  await interaction.editReply({ content: '✅ 経費申請を承認しました。'});
}

/**
 * 経費申請 修正ボタン押下
 */
async function handleKeihiEdit(interaction) {
  const guildId = interaction.guild.id;
  const user = interaction.user;
  const message = interaction.message;
  const embed = message.embeds[0];

  if (!embed)
    return interaction.reply({ content: '⚠️ 元メッセージを取得できません。', flags: MessageFlags.Ephemeral });

  // 権限をチェックする
  const [storeRoleConfig, keihiConfig] = await Promise.all([loadStoreRoleConfig(guildId), loadKeihiConfig(guildId)]);
  if (!isAuthorized(interaction, embed, keihiConfig, storeRoleConfig)) {
    return interaction.reply({ content: '⚠️ 修正権限がありません。', flags: MessageFlags.Ephemeral });
  }

  // 修正モーダルを表示する
  const modal = new ModalBuilder()
    .setCustomId(`keihi:approve:edit_modal:${message.id}`)
    .setTitle('📝 経費申請 修正');

  const amountInput = new TextInputBuilder()
    .setCustomId('edit_amount')
    .setLabel('修正後の金額')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    // 現在の金額を初期値として設定する
    .setValue(embed.fields.find(f => f.name === '💴 金額')?.value.replace(/\D/g, '') || '');

  const noteInput = new TextInputBuilder()
    .setCustomId('edit_note')
    .setLabel('修正後の備考')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    // 現在の備考を初期値として設定する
    .setValue(embed.fields.find(f => f.name === '🗒️ 備考')?.value || '');

  modal.addComponents(
    new ActionRowBuilder().addComponents(amountInput),
    new ActionRowBuilder().addComponents(noteInput)
  );

  await interaction.showModal(modal);
}

/**
 * 修正モーダル送信後
 */
async function handleKeihiEditModal(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const guildId = interaction.guild.id;
  const user = interaction.user;
  const now = dayjs().format('YYYY/MM/DD HH:mm');
  const messageId = interaction.customId.split(':')[3];
  const channel = interaction.channel;
  const message = await channel.messages.fetch(messageId);
  const embed = message.embeds[0];
  if (!embed) return interaction.editReply({ content: '⚠️ 元のメッセージを取得できません。' });

  const newAmount = interaction.fields.getTextInputValue('edit_amount');
  const newNote = interaction.fields.getTextInputValue('edit_note');

  const edited = EmbedBuilder.from(embed)
    .setColor('#f1c40f')
    .setTitle('🧾 経費申請') // タイトルを戻す
    .setFooter({ text: `最終修正者: ${user.username} (${now})` })
    .spliceFields(
      embed.fields.findIndex(f => f.name === '💴 金額'),
      1,
      { name: '💴 金額', value: `${parseInt(newAmount).toLocaleString()} 円`, inline: true }
    )
    .spliceFields(
      embed.fields.findIndex(f => f.name === '🗒️ 備考'),
      1,
      { name: '🗒️ 備考', value: newNote || '—', inline: false }
    )
    .addFields({
      name: '🛠️ 修正者',
      value: `<@${user.id}>`,
      inline: true,
    })
    .setTimestamp(new Date());

  const [globalConfig, keihiConfig] = await Promise.all([getGuildConfig(guildId), loadKeihiConfig(guildId)]);
  const logChannelId = globalConfig.adminLogChannel;
  const storeName = interaction.channel.name.split('-')[1] || '不明店舗';

  // ✅ 店舗チャンネルへ通知する
  const editLogMessage = `✅経費申請が修正されました。\n修正時間：${now}\n入力者：${embed.fields.find(f => f.name === '👤 入力者')?.value}`;
  await updateChannelLog(interaction, getEmbedFields(embed), editLogMessage);

  // 管理ログを出力する
  if (logChannelId) {
    const logChannel = interaction.guild.channels.cache.get(logChannelId);
    if (logChannel) {
      await logChannel.send({
        embeds: [
          new EmbedBuilder()
            .setColor('#f1c40f')
            .setTitle(`✅ ${storeName}の経費申請を修正しました`)
            .setDescription(`修正者：<@${user.id}>　修正時間：${now}`)
            .addFields(
              { name: '📅 日付', value: embed.fields.find(f => f.name === '📅 日付')?.value || '—' },
              { name: '🏢 部署', value: embed.fields.find(f => f.name === '🏢 部署')?.value || '—' },
              { name: '📦 経費項目', value: embed.fields.find(f => f.name === '📦 経費項目')?.value || '—' },
              { name: '👤 修正者', value: `<@${user.id}>`, inline: true },
              { name: '⏰ 修正時間', value: now, inline: true },
            )
            .setURL(message.url)
            .setTimestamp(new Date()),
        ],
      });
    }
  }
  
  // データを更新する
  const applicantId = embed.fields.find(f => f.name === '👤 入力者')?.value?.replace(/[<@>]/g, '');
  const createdAt = embed.fields.find(f => f.name === '⏰ 入力時間')?.value;
  const date = embed.fields.find(f => f.name === '📅 日付')?.value;
  if (date && applicantId && createdAt) {
    const [y, m, d] = date.split('/');
    const dailyData = await readKeihiDaily(guildId, storeName, y, m, d);
    const targetIndex = dailyData.findIndex(
      entry => entry.applicant === applicantId && entry.createdAt === createdAt && entry.status === 'pending',
    );

    if (targetIndex !== -1) {
      dailyData[targetIndex].amount = parseInt(newAmount.replace(/\D/g, ''), 10);
      dailyData[targetIndex].note = newNote || '—';
      dailyData[targetIndex].modifiedAt = now;
      dailyData[targetIndex].modifier = user.id;
      await saveKeihiDaily(guildId, storeName, dailyData, true);
    } else {
      logger.warn(`⚠️ 修正対象の経費データが見つかりませんでした。ギルドID: ${guildId}, 店舗: ${storeName}, 申請者: ${applicantId}, 申請時間: ${createdAt}`);
    }
  }

  // メッセージ更新とモーダルへの応答をまとめる
  await message.edit({ content: `経費申請 修正しました 修正者：<@${user.id}> 修正時間：${now}`, embeds: [edited], components: message.components });
  await interaction.editReply({ content: '📝 経費申請を修正しました。' });
}

/**
 * 経費申請削除
 */
async function handleKeihiDelete(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const user = interaction.user;
  const message = interaction.message;
  const guildId = interaction.guild.id;
  const embed = message.embeds[0];
  if (!embed) return interaction.editReply({ content: '⚠️ メッセージを読み取れませんでした。' });
  
  // 権限をチェックする
  const [storeRoleConfig, keihiConfig] = await Promise.all([loadStoreRoleConfig(guildId), loadKeihiConfig(guildId)]);
  if (!isAuthorized(interaction, embed, keihiConfig, storeRoleConfig)) {
    return interaction.editReply({ content: '⚠️ 削除権限がありません。' });
  }

  const now = dayjs().format('YYYY/MM/DD HH:mm');

  // データを削除する
  const storeName = interaction.channel.name.split('-')[1] || '不明店舗';
  const authorId = embed.fields.find(f => f.name === '👤 入力者')?.value?.replace(/[<@>]/g, '');
  const date = embed.fields.find(f => f.name === '📅 日付')?.value;
  const createdAt = embed.fields.find(f => f.name === '⏰ 入力時間')?.value;
  if (date && authorId && createdAt) {
    const [y, m, d] = date.split('/');
    const dailyData = await readKeihiDaily(guildId, storeName, y, m, d);
    const filteredData = dailyData.filter(
      entry => !(entry.applicant === authorId && entry.createdAt === createdAt),
    );
    if (filteredData.length < dailyData.length) {
      await saveKeihiDaily(guildId, storeName, filteredData, true);
    }
  }

  // スレッドメッセージを更新（削除された旨を伝える）
  const deletedEmbed = EmbedBuilder.from(embed)
    .setColor('#e74c3c') // 赤色
    .setTitle('🧾 経費申請 ❌削除されました')
    .setFooter({ text: `削除者: ${user.username} (${now})` })
    .setTimestamp(new Date());

  // ボタンを無効化する
  const disabledComponents = message.components.map(row => {
    return new ActionRowBuilder().addComponents(
      row.components.map(button => ButtonBuilder.from(button).setDisabled(true))
    );
  });

  await message.edit({
    content: `経費申請 削除しました 削除者：<@${user.id}> 削除時間：${now}`,
    embeds: [deletedEmbed],
    components: disabledComponents,
  });

  // ログを出力する
  const deleteLogMessage = `❌経費申請が削除されました。\n削除者：<@${user.id}>　削除時間：${now}`;
  await updateChannelLog(interaction, getEmbedFields(embed), deleteLogMessage);

  const globalConfig = await getGuildConfig(guildId);
  const logChannelId = globalConfig?.adminLogChannel;
  if (logChannelId) {
    const logChannel = interaction.guild.channels.cache.get(logChannelId);
    if (logChannel) {
      await logChannel.send({
        embeds: [
          new EmbedBuilder()
            .setColor('#e74c3c') // 赤色
            .setTitle(`🗑️ ${storeName} の経費申請を削除しました`) // タイトル
            .setDescription(`削除者：<@${user.id}>　削除時間：${now}`) // 削除者と削除時間
            .addFields(
              { name: '📅 日付', value: embed.fields.find(f => f.name === '📅 日付')?.value || '—', inline: true },
              { name: '🏢 部署', value: embed.fields.find(f => f.name === '🏢 部署')?.value || '—', inline: true },
              { name: '📦 経費項目', value: embed.fields.find(f => f.name === '📦 経費項目')?.value || '—', inline: true },
              { name: '👤 入力者', value: embed.fields.find(f => f.name === '👤 入力者')?.value || '—', inline: true },
              { name: '👤 削除者', value: `<@${user.id}>`, inline: true },
              { name: '⏰ 削除時間', value: now, inline: true },
            )
            .setURL(message.url) // スレッドメッセージへのリンク
            .setTimestamp(new Date()),
        ],
      });
    }
  }

  await interaction.editReply({ content: `🗑️ 経費申請を削除しました。` });
}

module.exports = {
  handleKeihiApprove,
  handleKeihiEdit,
  handleKeihiEditModal,
  handleKeihiDelete,
};
