// src/handlers/config/configSelect_userInfo.js
const {
  StringSelectMenuBuilder,
  ActionRowBuilder,
  ModalBuilder,
  MessageFlags,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const { getGuildConfig, setGuildConfig } = require('../../utils/config/gcsConfigManager');
const { sendSettingLog } = require('./configLogger');
const { postConfigPanel } = require('./configPanel');

const encodeToken = (value) => Buffer.from(String(value), 'utf8').toString('base64');
const decodeToken = (token) => Buffer.from(String(token), 'base64').toString('utf8');

/**
 * ユーザー情報登録メニューを表示
 */
async function showUserSelect(interaction) {
  const guild = interaction.guild;
  const members = await guild.members.fetch({ withPresences: false });
  const config = await getGuildConfig(guild.id);

  const users = members.map((m) => ({
    label: m.user.username,
    value: m.user.id,
  }));

  const userSelect = new StringSelectMenuBuilder()
    .setCustomId('select_user_for_info')
    .setPlaceholder('ユーザーを選択')
    .addOptions(users.slice(0, 25)); // DiscordのSelectMenuは25件上限

  const row = new ActionRowBuilder().addComponents(userSelect);

  await interaction.reply({
    content: '👤 情報を登録するユーザーを選択してください。',
    components: [row],
    flags: MessageFlags.Ephemeral,
  });
  return;
}

/**
 * 店舗・役職選択メニューを表示
 */
async function showStoreRoleSelect(interaction, userId) {
  const config = await getGuildConfig(interaction.guild.id);
  const member = await interaction.guild.members.fetch(userId); // 選択されたユーザーの情報を取得
  const stores = config.stores || [];
  const roles = config.roles || [];

  if (stores.length === 0) {
    await interaction.update({
      content: '⚠️ 店舗がまだ登録されていません。設定パネルから店舗名を登録してください。',
      components: [],
    });
    return;
  }

  if (roles.length === 0) {
    await interaction.update({
      content: '⚠️ 役職がまだ登録されていません。先に役職編集を実行してください。',
      components: [],
    });
    return;
  }

  // 店舗選択
  const storeSelect = new StringSelectMenuBuilder()
    .setCustomId(`select_store_for_user_${userId}`)
    .setPlaceholder('所属店舗を選択')
    .addOptions(stores.slice(0, 25).map((s) => ({ label: s, value: s })));

  // 役職選択
  const roleSelect = new StringSelectMenuBuilder()
    .setCustomId(`select_role_for_user_${userId}`)
    .setPlaceholder('先に店舗を選択してください')
    .setDisabled(true)
    .addOptions(roles.slice(0, 25).map((r) => ({ label: r, value: encodeToken(r) })));

  await interaction.update({
    content: `🏢 **${member.user.tag}** さんの所属店舗と役職を選択してください。`,
    components: [new ActionRowBuilder().addComponents(storeSelect), new ActionRowBuilder().addComponents(roleSelect)],
  });
  return;
}

/**
 * 店舗選択後に役職セレクトを有効化
 */
async function handleStoreRoleSelect(interaction, userId) {
  const selectedStore = interaction.values?.[0];
  if (!selectedStore) {
    await interaction.reply({
      content: '⚠️ 店舗が選択されていません。',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const config = await getGuildConfig(interaction.guild.id);
  const stores = config.stores || [];
  const roles = config.roles || [];
  const targetMember = await interaction.guild.members.fetch(userId);

  if (stores.length === 0) {
    await interaction.update({
      content: '⚠️ 店舗がまだ登録されていません。設定パネルから店舗名を登録してください。',
      components: [],
    });
    return;
  }

  if (roles.length === 0) {
    await interaction.update({
      content: '⚠️ 役職がまだ登録されていません。先に役職編集を実行してください。',
      components: [],
    });
    return;
  }

  const storeSelect = new StringSelectMenuBuilder()
    .setCustomId(`select_store_for_user_${userId}`)
    .setPlaceholder('所属店舗を選択')
    .addOptions(
      stores.slice(0, 25).map((s) => ({
        label: s,
        value: s,
        default: s === selectedStore,
      })),
    );

  const storeToken = encodeToken(selectedStore);
  const roleSelect = new StringSelectMenuBuilder()
    .setCustomId(`select_role_for_user_${userId}_${storeToken}`)
    .setPlaceholder('役職を選択')
    .setDisabled(false)
    .addOptions(roles.slice(0, 25).map((r) => ({ label: r, value: encodeToken(r) })));

  await interaction.update({
    content: `🏢 **${targetMember.user.tag}** さんの店舗を **${selectedStore}** に設定しました。役職を選択してください。`,
    components: [new ActionRowBuilder().addComponents(storeSelect), new ActionRowBuilder().addComponents(roleSelect)],
  });
}

/**
 * 誕生年選択メニューを表示
 */
async function showBirthYearSelect(interaction, userId, storeName, roleName) {
  const member = await interaction.guild.members.fetch(userId);
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = currentYear - 19; i >= 1982; i--) { // 2006年から1982年まで
    years.push({ label: `${i}年`, value: String(i) });
  }

  const storeToken = encodeToken(storeName);
  const roleToken = encodeToken(roleName);
  const yearSelect = new StringSelectMenuBuilder()
    .setCustomId(`config:birth-year:${userId}:${storeToken}:${roleToken}`)
    .setPlaceholder('誕生年を選択してください')
    .addOptions(years);

  const row = new ActionRowBuilder().addComponents(yearSelect);

  await interaction.update({
    content: `🎂 **${member.user.tag}** さんの誕生年を選択してください。`,
    components: [row],
  });
}

/**
 * 誕生月選択メニューを表示
 */
async function showBirthMonthSelect(interaction, userId, storeName, roleName, birthYear) {
  const member = await interaction.guild.members.fetch(userId);
  const months = [];
  for (let i = 1; i <= 12; i++) {
    months.push({ label: `${i}月`, value: String(i).padStart(2, '0') });
  }

  const storeToken = encodeToken(storeName);
  const roleToken = encodeToken(roleName);
  const monthSelect = new StringSelectMenuBuilder()
    .setCustomId(`config:birth-month:${userId}:${storeToken}:${roleToken}:${birthYear}`)
    .setPlaceholder('誕生月を選択してください')
    .addOptions(months);

  const row = new ActionRowBuilder().addComponents(monthSelect);

  await interaction.update({
    content: `🎂 **${member.user.tag}** さんの誕生月を選択してください。`,
    components: [row],
  });
}

/**
 * 誕生日選択メニューを表示
 */
async function showBirthDaySelect(interaction, userId, storeName, roleName, birthYear, birthMonth) {
  const member = await interaction.guild.members.fetch(userId);
  const daysInMonth = new Date(parseInt(birthYear, 10), parseInt(birthMonth, 10), 0).getDate();
  const days = [];
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ label: `${i}日`, value: String(i).padStart(2, '0') });
  }

  const storeToken = encodeToken(storeName);
  const roleToken = encodeToken(roleName);
  const daySelect = new StringSelectMenuBuilder()
    .setCustomId(`config:birth-day:${userId}:${storeToken}:${roleToken}:${birthYear}:${birthMonth}`)
    .setPlaceholder('誕生日を選択してください')
    .addOptions(days);

  const row1 = new ActionRowBuilder().addComponents(daySelect);

  await interaction.update({
    content: `🎂 **${member.user.tag}** さんの誕生日を選択してください。`,
    components: [row1],
  });
}

/**
 * SNS・住所・備考入力モーダルを表示
 */
async function showUserInfoModal(interaction, userId, storeName, roleName, birthYear, birthMonth, birthDay) {
  const dob = `${birthYear}-${birthMonth}-${birthDay}`;
  const storeToken = encodeToken(storeName);
  const roleToken = encodeToken(roleName);
  const modal = new ModalBuilder()
    .setCustomId(`modal:user-info:${userId}:${storeToken}:${roleToken}:${dob}`)
    .setTitle('🗒️ ユーザー詳細情報登録');

  // 既存のユーザー情報を取得してモーダルに初期値として設定
  const config = await getGuildConfig(interaction.guild.id);
  const existingUserInfo = config?.userInfo?.[userId] || {};

  const nicknameInput = new TextInputBuilder()
    .setCustomId('user_nickname')
    .setLabel('ニックネーム（任意）')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('例: 太郎')
    .setValue(existingUserInfo.nickname || '');

  const snsInput = new TextInputBuilder()
    .setCustomId('sns')
    .setLabel('SNS（任意）')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('例: @night_taro')
    .setValue(existingUserInfo.sns || '');

  const addressInput = new TextInputBuilder()
    .setCustomId('address')
    .setLabel('住所（任意）')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('例: 東京都新宿区歌舞伎町…');
    // .setValue(existingUserInfo.address || ''); // 住所は個人情報のため初期値設定は慎重に

  const noteInput = new TextInputBuilder()
    .setCustomId('note')
    .setLabel('備考（任意）')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('メモや特徴などを入力')
    .setValue(existingUserInfo.note || '');

  const row1 = new ActionRowBuilder().addComponents(nicknameInput);
  const row2 = new ActionRowBuilder().addComponents(snsInput);
  const row3 = new ActionRowBuilder().addComponents(addressInput);
  const row4 = new ActionRowBuilder().addComponents(noteInput);

  modal.addComponents(row1, row2, row3, row4);
  await interaction.showModal(modal);
}

/**
 * モーダル送信後 → GCS保存処理
 */
 async function handleUserInfoSubmit(interaction) {
  // customIdからuserId, storeName, roleName, dobを取得
  const [, , userId, storeToken, roleToken, ...dobParts] = interaction.customId.split(':');
  const dob = dobParts.join(':'); // dobがコロンを含む場合を考慮
  const roleName = decodeToken(roleToken);

  const nickname = interaction.fields.getTextInputValue('user_nickname');
  const sns = interaction.fields.getTextInputValue('sns');
  const address = interaction.fields.getTextInputValue('address');
  const note = interaction.fields.getTextInputValue('note');

  const guildId = interaction.guild.id;
  const config = (await getGuildConfig(guildId)) || {};

  if (!config.userInfo) config.userInfo = {};
  config.userInfo[userId] = {
    store: storeName,
    role: roleName,
    nickname,
    sns,
    address,
    note,
    dob, // 生年月日を追加
    updatedAt: new Date().toISOString(),
  };
  await setGuildConfig(guildId, config);

  const member = await interaction.guild.members.fetch(userId);
  const logMsg = `👤 **ユーザー情報登録**\n対象: ${member}\n店舗: **${storeName}**\n役職: **${roleName}**\nSNS: ${sns || '-'}\n住所: ${address || '-'}\n備考: ${note || '-'}`;
  
  await sendSettingLog(interaction.guild, {
    user: interaction.user,
    message: logMsg,
    type: 'ユーザー情報登録',
  });

  await interaction.reply({
    content: `✅ ${member.displayName} の情報を登録しました。`,
    flags: MessageFlags.Ephemeral,
  });

  await postConfigPanel(interaction.channel);
}

module.exports = {
  showUserSelect,
  showStoreRoleSelect,
  showUserInfoModal,
  showBirthYearSelect,
  showBirthMonthSelect,
  showBirthDaySelect,
  handleUserInfoSubmit,
  handleStoreRoleSelect,
  decodeToken,
};
